import moment from "moment"
import Comments from "../lib/collections/comments/collection"
import { getModeratorRateLimit, getTimeframeForRateLimit, userHasActiveModeratorActionOfType } from "../lib/collections/moderatorActions/helpers"
import { RATE_LIMIT_THREE_COMMENTS_PER_POST_PER_WEEK } from "../lib/collections/moderatorActions/schema"
import Posts from "../lib/collections/posts/collection"
import UserRateLimits from "../lib/collections/userRateLimits/collection"
import { forumSelect } from "../lib/forumTypeUtils"
import { userIsAdmin, userIsMemberOf } from "../lib/vulcan-users/permissions"
import VotesRepo from "./repos/VotesRepo"
import { autoCommentRateLimits, autoPostRateLimits } from "../lib/rateLimits/constants"
import type { RateLimitInfo, RecentKarmaInfo, UserRateLimit } from "../lib/rateLimits/types"
import { calculateRecentKarmaInfo, getAutoRateLimitInfo, getMaxAutoLimitHours, getModRateLimitInfo, getStrictestRateLimitInfo, getUserRateLimitInfo, getUserRateLimitIntervalHours, shouldIgnorePostRateLimit } from "../lib/rateLimits/utils"



async function getModRateLimitHours(userId: string): Promise<number> {
  const moderatorRateLimit = await getModeratorRateLimit(userId)
  return moderatorRateLimit ? getTimeframeForRateLimit(moderatorRateLimit?.type) : 0
}

async function getModPostSpecificRateLimitHours(userId: string): Promise<number> {
  const hasPostSpecificRateLimit = await userHasActiveModeratorActionOfType(userId, RATE_LIMIT_THREE_COMMENTS_PER_POST_PER_WEEK)
  return hasPostSpecificRateLimit ? getTimeframeForRateLimit(RATE_LIMIT_THREE_COMMENTS_PER_POST_PER_WEEK) : 0
}

async function getPostsInTimeframe(user: DbUser, maxHours: number) {
  return await Posts.find({
    userId:user._id, 
    draft: false,
    postedAt: {$gte: moment().subtract(maxHours, 'hours').toDate()}
  }, {sort: {postedAt: -1}, projection: {postedAt: 1}}).fetch()
}

function getUserRateLimit<T extends DbUserRateLimit['type']>(userId: string, type: T) {
  return UserRateLimits.findOne({
    userId,
    type,
    $or: [{endedAt: null}, {endedAt: {$gt: new Date()}}]
  }, {
    sort: {
      createdAt: -1
    }
  }) as Promise<UserRateLimit<T> | null>;
}

async function getPostRateLimitInfos(user: DbUser, postsInTimeframe: Array<DbPost>, modRateLimitHours: number, userPostRateLimit: UserRateLimit<"allPosts">|null): Promise<Array<RateLimitInfo>> {
  // for each rate limit, get the next date that user could post  
  const userPostRateLimitInfo = getUserRateLimitInfo(userPostRateLimit, postsInTimeframe)

  const recentKarmaInfo = await getRecentKarmaInfo(user._id)
  const autoRatelimits = forumSelect(autoPostRateLimits)
  const autoRateLimitInfos = autoRatelimits?.map(
    rateLimit => getAutoRateLimitInfo(user, rateLimit, postsInTimeframe, recentKarmaInfo)
  ) ?? []

  // modRateLimitInfo is sort of deprecated, but we're still using it for at least a couple months
  const modRateLimitInfo = getModRateLimitInfo(postsInTimeframe, modRateLimitHours, 1)

  return [modRateLimitInfo, userPostRateLimitInfo, ...autoRateLimitInfos].filter((rateLimit): rateLimit is RateLimitInfo => rateLimit !== null)
}

async function getCommentsInTimeframe(userId: string, maxTimeframe: number) {
  const commentsInTimeframe = await Comments.find(
    { userId: userId, 
      postedAt: {$gte: moment().subtract(maxTimeframe, 'hours').toDate()}
    }, {
      sort: {postedAt: -1}, 
      projection: {postId: 1, postedAt: 1}
    }
  ).fetch()
  return commentsInTimeframe
}

/**
 * Checks if the user is exempt from commenting rate limits (optionally, for the given post).
 *
 * Admins and mods are always exempt.
 * If the post has "ignoreRateLimits" set, then all users are exempt.
 * On forums other than the EA Forum, the post author is always exempt on their own posts.
 */
async function shouldIgnoreCommentRateLimit(user: DbUser, postId: string|null, context: ResolverContext): Promise<boolean> {
  if (userIsAdmin(user) || userIsMemberOf(user, "sunshineRegiment")) {
    return true;
  }
  if (postId) {
    const post = await context.loaders.Posts.load(postId);
    if (post?.ignoreRateLimits) {
      return true;
    }
  }
  return false;
}

async function getUserIsAuthor(userId: string, postId: string|null, context: ResolverContext): Promise<boolean> {
  if (!postId) return false
  const post = await context.loaders.Posts.load(postId);
  if (!post) return false
  const userIsNotPrimaryAuthor = post.userId !== userId
  const userIsNotCoauthor = !post.coauthorStatuses || post.coauthorStatuses.every(coauthorStatus => coauthorStatus.userId !== userId)
  return !(userIsNotPrimaryAuthor && userIsNotCoauthor)
}

function getModPostSpecificRateLimitInfo (comments: Array<DbComment>, modPostSpecificRateLimitHours: number, postId: string | null, userIsAuthor: boolean): RateLimitInfo|null {
  const eligibleForCommentOnSpecificPostRateLimit = (modPostSpecificRateLimitHours > 0) && !userIsAuthor;
  const commentsOnPost = comments.filter(comment => comment.postId === postId)

  return eligibleForCommentOnSpecificPostRateLimit ? getModRateLimitInfo(commentsOnPost, modPostSpecificRateLimitHours, 3) : null
}

async function getCommentsOnOthersPosts(comments: Array<DbComment>, userId: string) {
  const postIds = comments
    .map(comment => comment.postId)
    .filter(postId => !!postId) //exclude null post IDs (eg comments on tags)

  const postsNotAuthoredByCommenter = postIds.length>0
    ? await Posts.find(
        {_id: {$in: postIds}, userId: {$ne: userId}},
        {projection: {_id:1, coauthorStatuses:1}}
      ).fetch()
    : [];

  // right now, filtering out coauthors doesn't work (due to a bug in our query builder), so we're doing that manually
  const postsNotCoauthoredByCommenter = postsNotAuthoredByCommenter.filter(post => !post.coauthorStatuses || post.coauthorStatuses.every(coauthorStatus => coauthorStatus.userId !== userId))
  const postsNotAuthoredByCommenterIds = postsNotCoauthoredByCommenter.map(post => post._id)
  const commentsOnNonauthorPosts = comments.filter(comment => postsNotAuthoredByCommenterIds.includes(comment.postId))
  return commentsOnNonauthorPosts
}

async function getCommentRateLimitInfos({commentsInTimeframe, user, modRateLimitHours, modPostSpecificRateLimitHours, postId, userCommentRateLimit, context}: {
  commentsInTimeframe: Array<DbComment>,
  user: DbUser,
  modRateLimitHours: number,
  modPostSpecificRateLimitHours: number,
  userCommentRateLimit: UserRateLimit<'allComments'> | null,
  postId: string | null
  context: ResolverContext
}): Promise<Array<RateLimitInfo>> {
  const userIsAuthor = await getUserIsAuthor(user._id, postId, context)
  const commentsOnOthersPostsInTimeframe =  await getCommentsOnOthersPosts(commentsInTimeframe, user._id)
  const modGeneralRateLimitInfo = getModRateLimitInfo(commentsOnOthersPostsInTimeframe, modRateLimitHours, 1)

  const modSpecificPostRateLimitInfo = getModPostSpecificRateLimitInfo(commentsOnOthersPostsInTimeframe, modPostSpecificRateLimitHours, postId, userIsAuthor)

  const userRateLimitInfo = userIsAuthor ? null : getUserRateLimitInfo(userCommentRateLimit, commentsOnOthersPostsInTimeframe)

  const autoRateLimits = forumSelect(autoCommentRateLimits)
  const filteredAutoRateLimits = autoRateLimits?.filter(rateLimit => {
    if (userIsAuthor) return rateLimit.appliesToOwnPosts
    return true 
  })

  const recentKarmaInfo = await getRecentKarmaInfo(user._id)
  const autoRateLimitInfos = filteredAutoRateLimits?.map(
    rateLimit => getAutoRateLimitInfo(user, rateLimit, commentsInTimeframe, recentKarmaInfo)
  ) ?? []
  return [modGeneralRateLimitInfo, modSpecificPostRateLimitInfo, userRateLimitInfo, ...autoRateLimitInfos].filter((rateLimit): rateLimit is RateLimitInfo => rateLimit !== null)
}

export async function rateLimitDateWhenUserNextAbleToPost(user: DbUser): Promise<RateLimitInfo|null> {
  // Admins and Sunshines aren't rate-limited
  if (shouldIgnorePostRateLimit(user)) return null;
  
  // does the user have a moderator-assigned rate limit?
  const [modRateLimitHours, userPostRateLimit] = await Promise.all([
    getModRateLimitHours(user._id),
    getUserRateLimit(user._id, 'allPosts')
  ]);

  // what's the longest rate limit timeframe being evaluated?
  const userPostRateLimitHours = getUserRateLimitIntervalHours(userPostRateLimit);
  const maxPostAutolimitHours = getMaxAutoLimitHours(forumSelect(autoPostRateLimits));
  const maxHours = Math.max(modRateLimitHours, userPostRateLimitHours, maxPostAutolimitHours);

  // fetch the posts from within the maxTimeframe
  const postsInTimeframe = await getPostsInTimeframe(user, maxHours);

  const rateLimitInfos = await getPostRateLimitInfos(user, postsInTimeframe, modRateLimitHours, userPostRateLimit);

  return getStrictestRateLimitInfo(rateLimitInfos)
}

export async function rateLimitDateWhenUserNextAbleToComment(user: DbUser, postId: string|null, context: ResolverContext): Promise<RateLimitInfo|null> {
  const ignoreRateLimits = await shouldIgnoreCommentRateLimit(user, postId, context);
  if (ignoreRateLimits) return null;

  // does the user have a moderator-assigned rate limit?
  const [modRateLimitHours, modPostSpecificRateLimitHours, userCommentRateLimit] = await Promise.all([
    getModRateLimitHours(user._id),
    getModPostSpecificRateLimitHours(user._id),
    getUserRateLimit(user._id, 'allComments')
  ]);

  // what's the longest rate limit timeframe being evaluated?
  const maxCommentAutolimitHours = getMaxAutoLimitHours(forumSelect(autoCommentRateLimits))
  const maxHours = Math.max(modRateLimitHours, modPostSpecificRateLimitHours, maxCommentAutolimitHours);

  // fetch the comments from within the maxTimeframe
  const commentsInTimeframe = await getCommentsInTimeframe(user._id, maxHours);

  const rateLimitInfos = await getCommentRateLimitInfos({
    commentsInTimeframe,
    user,
    modRateLimitHours,
    modPostSpecificRateLimitHours,
    postId,
    userCommentRateLimit,
    context,
  });

  return getStrictestRateLimitInfo(rateLimitInfos)
}

export async function getRecentKarmaInfo (userId: string): Promise<RecentKarmaInfo> {
  const votesRepo = new VotesRepo()
  const allVotes = await votesRepo.getVotesOnRecentContent(userId)
  return calculateRecentKarmaInfo(userId, allVotes)
}
