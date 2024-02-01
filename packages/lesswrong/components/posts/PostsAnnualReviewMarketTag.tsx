import { AnnualReviewMarketInfo } from '../../lib/annualReviewMarkets';
import { useSingle } from '../../lib/crud/withSingle';
import { Components, registerComponent } from '../../lib/vulcan-lib';
import React from 'react';
import { useHover } from '../common/withHover';

const styles = (theme: ThemeType) => ({
  expectedWinner: {
    color: theme.palette.review.winner,
    border: '1px solid',
    borderColor: theme.palette.review.winner,
    borderRadius: '4px',
    fontFamily: theme.typography.fontFamily,
    width: 'fit-content',
    display: 'inline-block',
    padding: '5px',
    boxSizing: 'border-box',
  },
  preview: {
    maxWidth: 400,
  },
});

const PostsAnnualReviewMarketTag = ({ post, annualReviewMarketInfo, classes }: {
  post: PostsWithNavigation | PostsWithNavigationAndRevision | PostsList,
  annualReviewMarketInfo: AnnualReviewMarketInfo,
  classes: ClassesType<typeof styles>,
}) => {

  const { CommentsNode, LWPopper } = Components;
  const { anchorEl, hover, eventHandlers } = useHover();

  const annualReviewMarketCommentId = post.annualReviewMarketCommentId

  const { document: comment } = useSingle({
    documentId: annualReviewMarketCommentId,
    collectionName: "Comments",
    fragmentName: "CommentsList",
  });

  const decimalPlaces = 0;
  return <span>
    <div className={classes.expectedWinner} {...eventHandlers}>
      {annualReviewMarketInfo.year} Top Fifty: {parseFloat((annualReviewMarketInfo.probability * 100).toFixed(decimalPlaces))}%
      {!!comment &&
        <LWPopper
          open={hover}
          anchorEl={anchorEl}
          placement="bottom-end"
          clickable={true}
        >
          <div className={classes.preview}>
            <CommentsNode
              truncated
              nestingLevel={1}
              comment={comment}
              treeOptions={{
                post: post,
                forceNotSingleLine: true,
              }}
              hoverPreview
            >
            </CommentsNode>
          </div>
        </LWPopper>
      }
    </div>
  </span>
};

const PostsAnnualReviewMarketTagComponent = registerComponent('PostsAnnualReviewMarketTag', PostsAnnualReviewMarketTag, { styles });

declare global {
  interface ComponentTypes {
    PostsAnnualReviewMarketTag: typeof PostsAnnualReviewMarketTagComponent
  }
}
