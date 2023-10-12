
interface AlgoliaComment {
  objectID: string,
  _id: string,
  userId: string | null,
  baseScore: number | null ,
  isDeleted: boolean | null,
  retracted: boolean | null,
  deleted: boolean | null,
  spam: boolean | null,
  legacy: boolean | null,
  userIP: string | null,
  createdAt: Date | null,
  postedAt: Date | null,
  publicDateMs: number, // the date (in ms) when this became "public" (ex. comment postedAt, or user createdAt)
  af: boolean | null,
  authorDisplayName?: string | null,
  authorUserName?: string | null,
  authorSlug?: string | null,
  postId?: string | null,
  postTitle?: string | null,
  postSlug?: string | null,
  postIsEvent?: boolean | null,
  postGroupId?: string | null,
  tags: Array<string>, // an array of tag _ids that are associated with the comment, whether via tagId or via tagRels
  body: string,
  tagId?: string,
  tagName?: string | null,
  tagSlug?: string | null,
  tagCommentType?: import("../../lib/collections/comments/types").TagCommentType | null
}

interface AlgoliaSequence {
  objectID: string,
  _id: string,
  title: string | null,
  userId: string | null,
  createdAt: Date | null,
  publicDateMs: number,
  af: boolean | null,
  authorDisplayName?: string | null,
  authorUserName?: string | null,
  authorSlug?: string | null,
  plaintextDescription: string,
  bannerImageId?: string | null,
}

interface AlgoliaUser {
  _id: string,
  objectID: string,
  username: string,
  displayName: string,
  createdAt: Date,
  publicDateMs: number,
  isAdmin: boolean,
  profileImageId?: string,
  bio: string,
  htmlBio: string,
  karma: number,
  slug: string,
  jobTitle?: string,
  organization?: string,
  website: string,
  groups: Array<string>,
  af: boolean,
  _geoloc?: {
    lat: number,
    lng: number
  },
  mapLocationAddress?: string,
  tags: Array<string>,
}

interface AlgoliaPost {
  _id: string,
  userId: string | null,
  url: string | null,
  title: string | null,
  slug: string | null,
  baseScore: number | null,
  status: number,
  curated: boolean,
  legacy: boolean | null,
  commentCount: number | null,
  userIP: string | null,
  createdAt: Date | null,
  postedAt: Date | null,
  publicDateMs: number,
  isFuture: boolean | null,
  isEvent: boolean | null,
  viewCount: number | null,
  lastCommentedAt: Date | null,
  draft: boolean | null,
  af: boolean | null,
  tags: Array<string>,
  authorSlug?: string | null,
  authorDisplayName?: string | null,
  authorFullName?: string | null,
  feedName?: string | null,
  feedLink?: string | null,
  body: string,
  order: number // we split posts into multiple records (based on body paragraph) - this tells us the order to reconstruct them
}

interface AlgoliaTag {
  _id: string,
  objectID: string,
  name: string | null,
  slug: string | null,
  core: boolean | null,
  defaultOrder: number | null,
  suggestedAsFilter: boolean | null,
  postCount: number | null,
  wikiOnly: boolean | null,
  isSubforum: boolean | null,
  description: string,
  bannerImageId?: string | null,
  parentTagId?: string | null,
}
