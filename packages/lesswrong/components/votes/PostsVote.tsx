import { Components, registerComponent } from '../../lib/vulcan-lib';
import React from 'react';
import Tooltip, { TooltipProps } from '@material-ui/core/Tooltip';
import classNames from 'classnames';
import { useVote } from './withVote';
import { forumTypeSetting, isEAForum } from '../../lib/instanceSettings';
import { useCurrentUser } from '../common/withUser';
import { userCanVote } from '../../lib/collections/users/helpers';

const styles = (theme: ThemeType): JssStyles => ({
  voteBlock: {
    width: 50,
  },
  voteBlockHorizontal: {
    display: 'flex',
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  upvote: {
    marginBottom: -21
  },
  upvoteHorizontal: {
    marginTop: -8
  },
  downvote: {
    marginTop: -28
  },
  downvoteHorizontal: {
    marginTop: -6
  },
  voteScores: {
    margin:"15%",
  },
  voteScoresHorizontal: {
    margin: '0 12px'
  },
  voteScore: {
    color: isEAForum ? theme.palette.grey[600] : theme.palette.grey[500],
    position: 'relative',
    zIndex: theme.zIndexes.postsVote,
    fontSize: '55%',
  },
  voteScoreGoodHeart: {
    ...theme.typography.commentStyle,
    color: theme.palette.grey[700],
    fontSize: '45%',
    textAlign: "center",
  },
  secondaryVoteScore: {
    fontSize: '35%',
    marginBottom: 2,
  },
  tooltip: {
    color: theme.palette.grey[500],
    fontSize: '1rem',
    backgroundColor: theme.palette.panelBackground.default,
    transition: 'opacity 150ms cubic-bezier(0.4, 0, 1, 1) 0ms',
    marginLeft: 0,
    paddingTop: isEAForum ? 12 : 0
  },
})

const PostsVote = ({ post, useHorizontalLayout, classes }: {
  post: PostsWithVotes,
  useHorizontalLayout?: boolean,  /** if true, display the vote arrows to the left & right of the score */
  classes: ClassesType
}) => {
  const voteProps = useVote(post, "Posts");
  const {OverallVoteButton, Typography} = Components;
  const currentUser = useCurrentUser();
  
  const {fail, reason: whyYouCantVote} = userCanVote(currentUser);
  const canVote = !fail;
  
  let tooltipPlacement: "left"|"right"|"top" = isEAForum ? "left" : "right"
  if (useHorizontalLayout) {
    tooltipPlacement = "top"
  }

  return (
      <div className={classNames({[classes.voteBlock]: !useHorizontalLayout, [classes.voteBlockHorizontal]: useHorizontalLayout})}>
        <Tooltip
          title={whyYouCantVote ?? "Click-and-hold for strong vote"}
          placement={tooltipPlacement}
          classes={{tooltip: classes.tooltip}}
        >
          <div className={classNames({[classes.upvote]: !useHorizontalLayout, [classes.upvoteHorizontal]: useHorizontalLayout})}>
            <OverallVoteButton
              orientation="up"
              color="secondary"
              upOrDown="Upvote"
              enabled={canVote}
              {...voteProps}
            />
          </div>
        </Tooltip>
        <div className={classNames({[classes.voteScores]: !useHorizontalLayout, [classes.voteScoresHorizontal]: useHorizontalLayout})}>
          <Tooltip
            title={`${voteProps.voteCount} ${voteProps.voteCount == 1 ? "Vote" : "Votes"}`}
            placement={tooltipPlacement}
            classes={{tooltip: classes.tooltip}}
          >
            <div>
              {/* Have to make sure to wrap this in a div because Tooltip requires a child that takes refs */}
              <Typography variant="headline" className={classes.voteScore}>{voteProps.baseScore}</Typography>
            </div>
          </Tooltip>

          {!!post.af && !!post.afBaseScore && forumTypeSetting.get() !== 'AlignmentForum' &&
            <Tooltip
              title="AI Alignment Forum karma"
              placement={tooltipPlacement}
              classes={{tooltip: classes.tooltip}}
            >
              <Typography
                variant="headline"
                className={classNames(classes.voteScore, classes.secondaryVoteScore)}>
                Ω {post.afBaseScore}
              </Typography>
            </Tooltip>
          }
        </div>
        <Tooltip
          title={whyYouCantVote ?? "Click-and-hold for strong vote"}
          placement={tooltipPlacement}
          classes={{tooltip: classes.tooltip}}
        >
          <div className={classNames({[classes.downvote]: !useHorizontalLayout, [classes.downvoteHorizontal]: useHorizontalLayout})}>
            <OverallVoteButton
              orientation="down"
              color="error"
              upOrDown="Downvote"
              enabled={canVote}
              {...voteProps}
            />
          </div>
        </Tooltip>
      </div>)
}

const PostsVoteComponent = registerComponent('PostsVote', PostsVote, {styles});

declare global {
  interface ComponentTypes {
    PostsVote: typeof PostsVoteComponent
  }
}

