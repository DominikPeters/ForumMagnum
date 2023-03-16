import React, { useState, useCallback } from 'react';
import { Components, registerComponent } from '../../lib/vulcan-lib';
import { useCurrentUser } from '../common/withUser';
import { useGlobalKeydown } from '../common/withGlobalKeydown';
import { forumTypeSetting } from '../../lib/instanceSettings';

const isEAForum = forumTypeSetting.get() === "EAForum"

const RecentDiscussionFeed = ({ commentsLimit, maxAgeHours, af, refetchRef }: {
  commentsLimit?: number,
  maxAgeHours?: number,
  af?: boolean,
  refetchRef: React.RefObject<null|(()=>void)>
}) => {
  const [expandAllThreads, setExpandAllThreads] = useState(false);
  const currentUser = useCurrentUser();
  const expandAll = currentUser?.noCollapseCommentsFrontpage || expandAllThreads
  
  useGlobalKeydown(event => {
    const F_Key = 70
    if ((event.metaKey || event.ctrlKey) && event.keyCode == F_Key) {
      setExpandAllThreads(true);
    }
  });
  
  const { MixedTypeFeed, RecentDiscussionThread, RecentDiscussionTagRevisionItem, RecentDiscussionTag, RecentDiscussionSubscribeReminder, RecentDiscussionMeetupsPoke, RecentDiscussionSubforumThread } = Components;
  
  const refetch = useCallback(() => {
    if (refetchRef.current)
      refetchRef.current();
  }, [refetchRef]);

  return <MixedTypeFeed
    firstPageSize={10}
    pageSize={20}
    refetchRef={refetchRef}
    resolverName="RecentDiscussionFeed"
    sortKeyType="Date"
    resolverArgs={{ af: 'Boolean' }}
    resolverArgsValues={{ af }}
    fragmentArgs={{
      commentsLimit: 'Int',
      maxAgeHours: 'Int',
      tagCommentsLimit: 'Int',
    }}
    fragmentArgsValues={{
      commentsLimit, maxAgeHours,
      tagCommentsLimit: commentsLimit,
    }}
    renderers={{
      postCommented: {
        fragmentName: "PostsRecentDiscussion",
        render: (post: PostsRecentDiscussion) => (
          <RecentDiscussionThread
            post={post}
            refetch={refetch}
            comments={post.recentComments}
            expandAllThreads={expandAll}
          />
        )
      },
      tagDiscussed: {
        fragmentName: "TagRecentDiscussion",
        render: (tag: TagRecentDiscussion) => (
          <RecentDiscussionTag
            tag={tag}
            refetch={refetch}
            comments={tag.recentComments}
            expandAllThreads={expandAll}
          />
        )
      },
      tagSubforumComments: {
        fragmentName: "CommentWithRepliesFragment",
        render: (comment: CommentWithRepliesFragment) => (
          <RecentDiscussionSubforumThread
            comment={comment}
            tag={comment.tag}
            refetch={refetch}
            expandAllThreads={expandAll}
          />
        ),
      },
      tagRevised: {
        fragmentName: "RevisionTagFragment",
        render: (revision: RevisionTagFragment) => <div>
          {revision.tag && <RecentDiscussionTagRevisionItem
            tag={revision.tag}
            revision={revision}
            headingStyle="full"
            documentId={revision.documentId}
          />}
        </div>,
      },
      subscribeReminder: {
        fragmentName: null,
        render: () => <RecentDiscussionSubscribeReminder/>
      },
      meetupsPoke: {
        fragmentName: null,
        render: () => isEAForum ? null : <RecentDiscussionMeetupsPoke/>
      },
    }}
  />
}

const RecentDiscussionFeedComponent = registerComponent('RecentDiscussionFeed', RecentDiscussionFeed, {
  areEqual: "auto",
});

declare global {
  interface ComponentTypes {
    RecentDiscussionFeed: typeof RecentDiscussionFeedComponent,
  }
}
