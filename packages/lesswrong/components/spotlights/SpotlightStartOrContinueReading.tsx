import classNames from 'classnames';
import React from 'react';
import { postGetPageUrl } from '../../lib/collections/posts/helpers';
import { useMulti } from '../../lib/crud/withMulti';
import { Link } from '../../lib/reactRouterWrapper';
import { registerComponent, Components } from '../../lib/vulcan-lib';
import { useItemsRead } from '../common/withRecordPostView';
import { postProgressBoxStyles } from '../sequences/BooksProgressBar';

const styles = (theme: ThemeType): JssStyles => ({
  firstPost: {
    ...theme.typography.body2,
    fontSize: "1.1rem",
    ...theme.typography.commentStyle,
    position: "relative",
    zIndex: theme.zIndexes.spotlightItemCloseButton,
    color: theme.palette.grey[500],
    '& a': {
      color: theme.palette.primary.main
    }
  },
  postProgressBox: {
    ...postProgressBoxStyles(theme)
  },
  read: {
    backgroundColor: theme.palette.primary.main,
    border: theme.palette.primary.dark,
    opacity: .4
  }
});

export const SpotlightStartOrContinueReading = ({classes, spotlight}: {
  spotlight: SpotlightDisplay,
  classes: ClassesType,
  }) => {
    const { LWTooltip, PostsPreviewTooltip} = Components
  const { results: chapters } = useMulti({
    terms: {
      view: "SequenceChapters",
      sequenceId: spotlight.documentId,
      limit: 100
    },
    collectionName: "Chapters",
    fragmentName: 'ChaptersFragment',
    enableTotal: false,
    skip: spotlight.documentType !== "Sequence"
  });
  
  const { postsRead: clientPostsRead } = useItemsRead();
  const posts = chapters?.flatMap(chapter => chapter.posts ?? []) ?? []
  const readPosts = posts.filter(post => post.isRead || clientPostsRead[post._id])
  
  // Note: the firstPostUrl won't reliably generate a good reading experience for all
  // possible Collection type spotlights, although it happens to work for the existing 5 collections 
  // on LessWrong. (if the first post of a collection has a canonical sequence that's not 
  // in that collection it wouldn't provide the right 'next post')
  // But, also, the real proper fix here is to integrate continue reading here.
  const firstPost = readPosts.length === 0 && posts[0]
  const firstPostSequenceId = spotlight.documentType === "Sequence" ? spotlight.documentId : undefined

  if (firstPost) {
    return <div className={classes.firstPost}>
      First Post: <LWTooltip title={<PostsPreviewTooltip post={firstPost}/>} tooltip={false}>
        <Link to={postGetPageUrl(firstPost, false, firstPostSequenceId)}>{firstPost.title}</Link>
      </LWTooltip>
    </div>
  } else {
    return <div>
    {posts.map(post => (
      <LWTooltip key={`${spotlight._id}-${post._id}`} title={<PostsPreviewTooltip post={post}/>} tooltip={false} flip={false}>
        <Link to={postGetPageUrl(post, false, firstPostSequenceId)}>
          <div className={classNames(classes.postProgressBox, {[classes.read]: post.isRead || clientPostsRead[post._id]})} />
        </Link>
      </LWTooltip>
     ))}
  </div>
  }
}

const SpotlightStartOrContinueReadingComponent = registerComponent('SpotlightStartOrContinueReading', SpotlightStartOrContinueReading, {styles});

declare global {
  interface ComponentTypes {
    SpotlightStartOrContinueReading: typeof SpotlightStartOrContinueReadingComponent
  }
}

