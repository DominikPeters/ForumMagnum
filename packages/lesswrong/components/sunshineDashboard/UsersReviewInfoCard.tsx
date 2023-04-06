import { Components, registerComponent } from '../../lib/vulcan-lib';
import React, { useState } from 'react';
import withErrorBoundary from '../common/withErrorBoundary'
import FlagIcon from '@material-ui/icons/Flag';
import { useMulti } from '../../lib/crud/withMulti';
import { userCanDo } from '../../lib/vulcan-users/permissions';
import classNames from 'classnames';
import { hideScrollBars } from '../../themes/styleUtils';
import { getReasonForReview } from '../../lib/collections/moderatorActions/helpers';
import { Link } from '../../lib/reactRouterWrapper'

const styles = (theme: ThemeType): JssStyles => ({
  root: {
    backgroundColor: theme.palette.grey[0],
    boxShadow: theme.palette.boxShadow.eventCard,
    marginBottom: 16,
    ...theme.typography.body2,
    fontSize: "1rem"
  },
  displayName: {
    fontSize: theme.typography.body1.fontSize,
    marginBottom: 4
  },
  icon: {
    height: 13,
    color: theme.palette.grey[500],
    position: "relative",
    top: 3
  },
  legacyReviewTrigger: {
    marginLeft: 6
  },
  referrerLandingPage: {
    display: 'flex'
  },
  basicInfoRow: {
    padding: 16,
    paddingBottom: 14,
    borderBottom: theme.palette.border.extraFaint
  },
  row: {
    display: "flex",
    alignItems: "center",
  },
  bigDownvotes: {
    color: theme.palette.error.dark,
    padding: 6,
    paddingTop: 3,
    paddingBottom: 3,
    marginRight:8,
    borderRadius: "50%",
    fontWeight: 600,
  },
  downvotes: {
    color: theme.palette.error.dark,
    opacity: .75,
    padding: 6,
    paddingTop: 3,
    paddingBottom: 3,
    marginRight:8,
    borderRadius: "50%",
  },
  upvotes: {
    color: theme.palette.primary.dark,
    opacity: .75,
    padding: 6,
    paddingTop: 3,
    paddingBottom: 3,
    marginRight:8,
    borderRadius: "50%",
  },
  bigUpvotes: {
    color: theme.palette.primary.dark,
    padding: 6,
    paddingTop: 3,
    paddingBottom: 3,
    marginRight:8,
    borderRadius: "50%",
    fontWeight: 600,
  },
  votesRow: {
    marginTop: 12,
    marginBottom: 12
  },
  bio: {
    '& a': {
      color: theme.palette.primary.main,
    }
  },
  website: {
    color: theme.palette.primary.main,
  },
  info: {
    // '& > * + *': {
    //   marginTop: 8,
    // },
    display: 'flex',
    flexWrap: 'wrap'
  },
  columns: {
    display: 'flex'
  },
  infoColumn: {
    width: '30%',
    minWidth: 388,
    padding: 16,
    paddingTop: 12,
    borderRight: theme.palette.border.extraFaint,
    position: "relative",
  },
  contentColumn: {
    width: '38%',
    padding: 16,
    paddingTop: 12,
    borderRight: theme.palette.border.extraFaint,
    position: "relative"
  },
  messagesColumn: {
    width: '32%',
    padding: 16,
    paddingTop: 12,
  },
  content: {
    marginTop: 16,
    marginBottom: 8,
    borderTop: theme.palette.border.extraFaint
  },
  expandButton: {
    display: "flex",
    justifyContent: "right",
    color: theme.palette.grey[500]
  },
  contentCollapsed: {
    maxHeight: 300,
    overflowY: "scroll",
    cursor: "pointer",
    ...hideScrollBars
  },
  flagged: {
    border: theme.palette.border.intense,
    borderColor: theme.palette.error.main
  }
})

const UsersReviewInfoCard = ({ user, refetch, currentUser, classes }: {
  user: SunshineUsersList,
  currentUser: UsersCurrent,
  refetch: () => void,
  classes: ClassesType,
}) => {
  const {
    MetaInfo, FormatDate, SunshineUserMessages, LWTooltip, UserReviewStatus,
    SunshineNewUserPostsList, ContentSummaryRows, SunshineNewUserCommentsList, ModeratorActions,
    UsersName, NewUserDMSummary, FirstContentIcons
  } = Components

  const [contentExpanded, setContentExpanded] = useState<boolean>(false)
    
  
  const { results: posts = [], loading: postsLoading } = useMulti({
    terms:{view:"sunshineNewUsersPosts", userId: user._id},
    collectionName: "Posts",
    fragmentName: 'SunshinePostsList',
    fetchPolicy: 'cache-and-network',
    limit: 10
  });
  
  const { results: comments = [], loading: commentsLoading } = useMulti({
    terms:{view:"sunshineNewUsersComments", userId: user._id},
    collectionName: "Comments",
    fragmentName: 'CommentsListWithParentMetadata',
    fetchPolicy: 'cache-and-network',
    limit: 10
  });

  const reviewTrigger = getReasonForReview(user)
  const showReviewTrigger = reviewTrigger !== 'noReview' && reviewTrigger !== 'alreadyApproved';
  
  if (!userCanDo(currentUser, "posts.moderate.all")) return null
  
  const basicInfoRow = <div className={classes.basicInfoRow}>
    <div>
      <div className={classes.displayName}>
        <UsersName user={user}/>
        <FirstContentIcons user={user}/>
        {user.sunshineFlagged && <FlagIcon className={classes.icon}/>}
        {showReviewTrigger && <MetaInfo className={classes.legacyReviewTrigger}>{reviewTrigger}</MetaInfo>}
      </div>
      <UserReviewStatus user={user}/>
    </div>

    <div className={classes.row}>
      <MetaInfo className={classes.info}>
        { user.karma || 0 } karma
      </MetaInfo>
      <MetaInfo>
        {user.email}
      </MetaInfo>
      <MetaInfo className={classes.info}>
        <FormatDate date={user.createdAt}/>
      </MetaInfo>
    </div>
  </div>

  const votesRow = <div className={classes.votesRow}>
    <span>Votes: </span>
    <LWTooltip title="Big Upvotes">
      <span className={classes.bigUpvotes}>
        { user.bigUpvoteCount || 0 }
      </span>
    </LWTooltip>
    <LWTooltip title="Upvotes">
      <span className={classes.upvotes}>
        { user.smallUpvoteCount || 0 }
      </span>
    </LWTooltip>
    <LWTooltip title="Downvotes">
      <span className={classes.downvotes}>
        { user.smallDownvoteCount || 0 }
      </span>
    </LWTooltip>
    <LWTooltip title="Big Downvotes">
      <span className={classes.bigDownvotes}>
        { user.bigDownvoteCount || 0 }
      </span>
    </LWTooltip>
  </div>

  const renderExpand = !!(posts?.length || comments?.length)
  
  return (
    <div className={classNames(classes.root, {[classes.flagged]:user.sunshineFlagged})}>
      {basicInfoRow}
      <div className={classes.columns}>
        <div className={classes.infoColumn}>
          <div>
            <ModeratorActions user={user} currentUser={currentUser} refetch={refetch} comments={comments} posts={posts}/>
            <UserReviewStatus user={user}/>
          </div>
        </div>
        <div className={classes.contentColumn}>
          <div dangerouslySetInnerHTML={{__html: user.htmlBio}} className={classes.bio}/>
          {user.website && <div>Website: <a href={`https://${user.website}`} target="_blank" rel="noopener noreferrer" className={classes.website}>{user.website}</a></div>}
          {votesRow}
          <ContentSummaryRows user={user} posts={posts} comments={comments} loading={commentsLoading || postsLoading} />
          <NewUserDMSummary user={user} />
          <div 
            className={classNames(classes.content, {[classes.contentCollapsed]: !contentExpanded})} onClick={() => setContentExpanded(true)}
          >
            <SunshineNewUserPostsList posts={posts} user={user}/>
            <SunshineNewUserCommentsList comments={comments} user={user}/>
          </div>
          {renderExpand && <a className={classes.expandButton} onClick={() => setContentExpanded(!contentExpanded)}>
            <MetaInfo>Expand</MetaInfo>
          </a>}
        </div>
        <div className={classes.messagesColumn}>
          <SunshineUserMessages user={user} currentUser={currentUser}/>
        </div>
      </div>
    </div>
  )
}

const UsersReviewInfoCardComponent = registerComponent('UsersReviewInfoCard', UsersReviewInfoCard, {
  styles,
  hocs: [
    withErrorBoundary,
  ],
});

declare global {
  interface ComponentTypes {
    UsersReviewInfoCard: typeof UsersReviewInfoCardComponent
  }
}
