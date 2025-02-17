import CollectionsRepo from "./CollectionsRepo";
import CommentsRepo from "./CommentsRepo";
import ConversationsRepo from "./ConversationsRepo";
import DatabaseMetadataRepo from "./DatabaseMetadataRepo";
import DebouncerEventsRepo from "./DebouncerEventsRepo";
import DialogueChecksRepo from "./DialogueChecksRepo";
import ElectionCandidatesRepo from "./ElectionCandidatesRepo";
import ElectionVotesRepo from "./ElectionVotesRepo";
import LocalgroupsRepo from "./LocalgroupsRepo";
import ManifoldProbabilitiesCachesRepo from "./ManifoldProbabilitiesCachesRepo";
import NotificationsRepo from "./NotificationsRepo";
import PageCacheRepo from "./PageCacheRepo";
import PostEmbeddingsRepo from "./PostEmbeddingsRepo";
import PostRecommendationsRepo from "./PostRecommendationsRepo";
import PostRelationsRepo from "./PostRelationsRepo";
import PostViewTimesRepo from "./PostViewTimesRepo";
import PostViewsRepo from "./PostViewsRepo";
import PostsRepo from "./PostsRepo";
import ReadStatusesRepo from "./ReadStatusesRepo";
import ReviewWinnersRepo from "./ReviewWinnersRepo";
import ReviewWinnerArtsRepo from "./ReviewWinnerArtsRepo";
import SequencesRepo from "./SequencesRepo";
import SplashArtCoordinatesRepo from "./SplashArtCoordinatesRepo";
import TagsRepo from "./TagsRepo";
import TypingIndicatorsRepo from "./TypingIndicatorsRepo";
import UsersRepo from "./UsersRepo";
import VotesRepo from "./VotesRepo";

declare global {
  type Repos = ReturnType<typeof getAllRepos>;
}

const getAllRepos = () => ({
  collections: new CollectionsRepo(),
  comments: new CommentsRepo(),
  conversations: new ConversationsRepo(),
  databaseMetadata: new DatabaseMetadataRepo(),
  debouncerEvents: new DebouncerEventsRepo(),
  dialogueChecks: new DialogueChecksRepo(),
  electionCandidates: new ElectionCandidatesRepo(),
  electionVotes: new ElectionVotesRepo(),
  localgroups: new LocalgroupsRepo(),
  notifications: new NotificationsRepo(),
  postEmbeddings: new PostEmbeddingsRepo(),
  pageCaches: new PageCacheRepo(),
  manifoldProbabilitiesCachesRepo: new ManifoldProbabilitiesCachesRepo(),
  postRecommendations: new PostRecommendationsRepo(),
  postRelations: new PostRelationsRepo(),
  posts: new PostsRepo(),
  postViews: new PostViewsRepo(),
  postViewTimes: new PostViewTimesRepo(),
  readStatuses: new ReadStatusesRepo(),
  reviewWinners: new ReviewWinnersRepo(),
  reviewWinnerArts: new ReviewWinnerArtsRepo(),
  sequences: new SequencesRepo(),
  splashArtCoordinates: new SplashArtCoordinatesRepo(),
  tags: new TagsRepo(),
  typingIndicators: new TypingIndicatorsRepo(),
  users: new UsersRepo(),
  votes: new VotesRepo(),
} as const);

export {
  CollectionsRepo,
  CommentsRepo,
  ConversationsRepo,
  DatabaseMetadataRepo,
  DebouncerEventsRepo,
  DialogueChecksRepo,
  ElectionCandidatesRepo,
  ElectionVotesRepo,
  LocalgroupsRepo,
  ManifoldProbabilitiesCachesRepo,
  NotificationsRepo,
  PageCacheRepo,
  PostEmbeddingsRepo,
  PostRecommendationsRepo,
  PostRelationsRepo,
  PostsRepo,
  ReadStatusesRepo,
  SequencesRepo,
  SplashArtCoordinatesRepo,
  TagsRepo,
  TypingIndicatorsRepo,
  UsersRepo,
  VotesRepo,
  getAllRepos,
};
