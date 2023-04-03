import React from 'react';
import { Components, registerComponent } from '../../lib/vulcan-lib';
import { useMulti } from '../../lib/crud/withMulti';

const PostsCommentsThread = ({ post, terms, newForm=true }: {
  post?: PostsDetails,
  terms: CommentsViewTerms,
  newForm?: boolean,
}) => {
  let { loading, results, loadMore, loadingMore, totalCount } = useMulti({
    terms,
    collectionName: "Comments",
    fragmentName: 'CommentsList',
    fetchPolicy: 'cache-and-network',
    enableTotal: true,
  });
  
  if (loading && !results) {
    return <Components.Loading />;
  } else if (!results) {
    return null;
  }

  const commentCount = results?.length ?? 0;

  return (
    <Components.CommentsListSection
      comments={results}
      loadMoreComments={loadMore}
      totalComments={totalCount as number}
      commentCount={commentCount}
      loadingMoreComments={loadingMore}
      post={post}
      newForm={newForm}
    />
  );
}

const PostsCommentsThreadComponent = registerComponent('PostsCommentsThread', PostsCommentsThread, {
  areEqual: {
    terms: "deep",
  }
});

declare global {
  interface ComponentTypes {
    PostsCommentsThread: typeof PostsCommentsThreadComponent
  }
}
