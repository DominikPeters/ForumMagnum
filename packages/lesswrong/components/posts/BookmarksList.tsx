import React from 'react';
import { registerComponent, Components } from '../../lib/vulcan-lib';
import { useCurrentUser } from '../common/withUser';
import { useMulti } from '../../lib/crud/withMulti';
import withErrorBoundary from '../common/withErrorBoundary';
import sortBy from 'lodash/sortBy';
import findIndex from 'lodash/findIndex';

const BookmarksList = ({limit=20, hideLoadMore=false}: {
  limit?: number,
  hideLoadMore?: boolean,
}) => {
  const currentUser = useCurrentUser();
  const { PostsItem2, LoadMore, Loading } = Components
  
  const {results: bookmarkedPosts, loading, loadMoreProps} = useMulti({
    collectionName: "Posts",
    terms: {
      view: "myBookmarkedPosts",
      limit: limit,
    },
    itemsPerPage: 20,
    fragmentName: "PostsList",
    skip: !currentUser?._id,
  });
  
  // HACK: The results have limit/pagination which correctly reflects the order
  // of currentUser.bookmarkedPostsMetadata, but within the limited result set
  // the posts themselves may be out of order. Sort them. See also comments in
  // the myBookmarkedPosts view.
  let sortedBookmarkedPosts = sortBy(bookmarkedPosts,
    post => -findIndex(
      currentUser?.bookmarkedPostsMetadata||[],
      (bookmark)=>bookmark.postId === post._id
    )
  );

  return <div>
    {bookmarkedPosts && sortedBookmarkedPosts.map((post: PostsList, i: number) =>
      <PostsItem2
        key={post._id} post={post} bookmark
        showBottomBorder={i < bookmarkedPosts.length-1}
      />
    )}
    {!hideLoadMore && <LoadMore {...loadMoreProps}/>}
  </div>
}

const BookmarksListComponent = registerComponent('BookmarksList', BookmarksList, {
  hocs: [withErrorBoundary]
});

declare global {
  interface ComponentTypes {
    BookmarksList: typeof BookmarksListComponent
  }
}
