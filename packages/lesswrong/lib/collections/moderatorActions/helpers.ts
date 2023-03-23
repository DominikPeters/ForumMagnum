import moment from "moment";
import { isEAForum } from "../../instanceSettings";
import ModeratorActions from "./collection";
import { MAX_ALLOWED_CONTACTS_BEFORE_FLAG, rateLimits, RateLimitType, RATE_LIMIT_ONE_PER_DAY, RATE_LIMIT_ONE_PER_FORTNIGHT, RATE_LIMIT_ONE_PER_MONTH, RATE_LIMIT_ONE_PER_THREE_DAYS, RATE_LIMIT_ONE_PER_WEEK } from "./schema";

/**
 * For a given RateLimitType, returns the number of hours a user has to wait before posting again.
 */
export function getTimeframeForRateLimit(type: RateLimitType) {
  let hours 
  switch(type) {
    case RATE_LIMIT_ONE_PER_DAY:
      hours = 24; 
      break;
    case RATE_LIMIT_ONE_PER_THREE_DAYS:
      hours = 24 * 3; 
      break;
    case RATE_LIMIT_ONE_PER_WEEK:
      hours = 24 * 7; 
      break;
    case RATE_LIMIT_ONE_PER_FORTNIGHT:
      hours = 24 * 14; 
      break;
    case RATE_LIMIT_ONE_PER_MONTH:
      hours = 24 * 30;
      break;
  }
  return hours
}

/**
 * Fetches the most recent, active rate limit affecting a user.
 */
export function getModeratorRateLimit(user: DbUser) {
  return ModeratorActions.findOne({
    userId: user._id,
    type: {$in: rateLimits},
    $or: [{endedAt: null}, {endedAt: {$gt: new Date()}}]
  }, {
    sort: {
      createdAt: -1
    }
  }) as Promise<DbModeratorAction & {type:RateLimitType} | null>
}

export function getAverageContentKarma(content: VoteableType[]) {
  const runningContentKarma = content.reduce((prev, curr) => prev + curr.baseScore, 0);
  return runningContentKarma / content.length;
}

interface ModeratableContent extends VoteableType {
  postedAt: Date;
}

type KarmaContentJudgment = {
  lowAverage: false;
  averageContentKarma?: undefined;
} | {
  lowAverage: boolean;
  averageContentKarma: number;
};

export function isLowAverageKarmaContent(content: ModeratableContent[], contentType: 'post' | 'comment'): KarmaContentJudgment {
  if (!content.length) return { lowAverage: false };

  const oneWeekAgo = moment().subtract(7, 'days').toDate();

  // If the user hasn't posted in a while, we don't care if someone's been voting on their old content
  // Also, using postedAt rather than createdAt to avoid posts that have remained as drafts for a while not getting evaluated
  if (content.every(item => item.postedAt < oneWeekAgo)) return { lowAverage: false };
  
  const lastNContent = contentType === 'comment' ? 10 : 5;
  const karmaThreshold = contentType === 'comment' ? 1.5 : 5;

  if (content.length < lastNContent) return { lowAverage: false };

  const lastNContentItems = content.slice(0, lastNContent);
  const averageContentKarma = getAverageContentKarma(lastNContentItems);

  const lowAverage = averageContentKarma < karmaThreshold;
  return { lowAverage, averageContentKarma };
}

export interface UserContentCountPartial {
  postCount?: number,
  commentCount?: number
}

export function getCurrentContentCount(user: UserContentCountPartial) {
  const postCount = user.postCount ?? 0
  const commentCount = user.commentCount ?? 0
  return postCount + commentCount
}

export function getReasonForReview(user: DbUser | SunshineUsersList, override?: true) {
  if (override) return 'override';

  const fullyReviewed = user.reviewedByUserId && !user.snoozedUntilContentCount;
  const neverReviewed = !user.reviewedByUserId;
  const snoozed = user.reviewedByUserId && user.snoozedUntilContentCount;

  if (fullyReviewed) return 'alreadyApproved';

  if (neverReviewed) {
    if (user.mapLocation && isEAForum) return 'mapLocation';
    if (user.postCount) return 'firstPost';
    if (user.commentCount) return 'firstComment';
    if (user.usersContactedBeforeReview?.length > MAX_ALLOWED_CONTACTS_BEFORE_FLAG) return 'contactedTooManyUsers';
    // Depends on whether this is DbUser or SunshineUsersList
    const htmlBio = 'htmlBio' in user ? user.htmlBio : user.biography?.html;
    if (htmlBio) return 'bio';
    if (user.profileImageId) return 'profileImage';  
  } else if (snoozed) {
    const contentCount = getCurrentContentCount(user);
    if (contentCount >= user.snoozedUntilContentCount) return 'newContent';
  }

  return 'noReview';
}
