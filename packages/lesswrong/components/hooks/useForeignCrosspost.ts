import { ApolloError, gql, useQuery } from "@apollo/client";
import { postGetCommentCountStr } from "../../lib/collections/posts/helpers";
import { UseSingleProps } from "../../lib/crud/withSingle";

export type PostWithForeignId = {
  fmCrosspost: {
    isCrosspost: true,
    hostedHere: boolean,
    foreignPostId: string,
  },
};

export const isPostWithForeignId =
  <T extends {fmCrosspost: PostsList["fmCrosspost"]}>(post: T): post is T & PostWithForeignId =>
    !!post.fmCrosspost &&
    !!post.fmCrosspost.isCrosspost &&
    typeof post.fmCrosspost.hostedHere === "boolean" &&
    !!post.fmCrosspost.foreignPostId;

const hasTableOfContents =
  <
    Post extends PostWithForeignId,
    WithContents extends Post & {tableOfContents: {sections: any[]}}
  >(post: Post): post is WithContents =>
    "tableOfContents" in post && Array.isArray((post as WithContents).tableOfContents?.sections);

/**
 * If this post was crossposted from elsewhere then we want to take some of the fields from
 * our local copy (for correct links/ids/etc.), but we want to override many of the fields
 * with foreign data, to keep the origin post as the source of truth, and get some metadata
 * that isn't denormalized across sites.
 */
const overrideFields = [
  "contents",
  "tableOfContents",
  "url",
  "readTimeMinutes",
] as const;

type PostFragments = 'PostsWithNavigation' | 'PostsWithNavigationAndRevision' | 'PostsList';
/**
 * Load foreign crosspost data from the foreign site
 */
export const useForeignCrosspost = <Post extends PostWithForeignId, FragmentTypeName extends PostFragments>(
  localPost: Post,
  fetchProps: Omit<UseSingleProps<FragmentTypeName>, "documentId" | "apolloClient">,
): {
  loading: boolean,
  error?: ApolloError,
  localPost: Post,
  foreignPost?: FragmentTypes[FragmentTypeName],
  combinedPost?: Post & FragmentTypes[FragmentTypeName],
} => {
  // From the user's perspective crossposts are created atomically (ie; failing to create a crosspost
  // will also fail to create a local post), so this should never create a race condition - if we hit
  // this then something's actually gone seriously wrong
  if (!localPost.fmCrosspost.foreignPostId) {
    throw new Error("Crosspost has not been created yet");
  }

  const getCrosspostQuery = gql`
    query GetCrosspostQuery($args: JSON) {
      getCrosspost(args: $args)
    }
  `;

  const args = {
    ...fetchProps,
    documentId: localPost.fmCrosspost.foreignPostId
  };

  const { data, loading, error } = useQuery(getCrosspostQuery, { variables: { args } });

  const foreignPost: FragmentTypes[FragmentTypeName] = data?.getCrosspost;

  let combinedPost: (Post & FragmentTypes[FragmentTypeName]) | undefined;
  if (!localPost.fmCrosspost.hostedHere) {
    combinedPost = {...foreignPost, ...localPost} as Post & FragmentTypes[FragmentTypeName];
    for (const field of overrideFields) {
      Object.assign(combinedPost, { [field]: foreignPost?.[field] ?? localPost[field] });
    }
    // We just took the table of contents from the foreign version, but we want to use the local comment count
    if (hasTableOfContents(combinedPost)) {
      combinedPost.tableOfContents = {
        ...combinedPost.tableOfContents,
        sections: combinedPost.tableOfContents.sections.map((section: {anchor?: string}) =>
          section.anchor === "comments"
            ? {...section, title: postGetCommentCountStr(localPost as unknown as PostsBase)}
            : section
        ),
      };
    }
  }

  return {
    loading,
    error,
    localPost,
    foreignPost,
    combinedPost,
  };
}
