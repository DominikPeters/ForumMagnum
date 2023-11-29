import React, {useState} from 'react';
import { registerComponent, Components } from '../../lib/vulcan-lib';
import { useTracking } from "../../lib/analyticsEvents";
import {useCurrentUser} from '../common/withUser';
import {gql, useQuery} from '@apollo/client';
import {DialogueUserRowProps} from '../users/DialogueMatchingPage';
import classNames from 'classnames';

const styles = (theme: ThemeType) => ({
  dialogueUserRow: { 
    display: 'flex',
    alignItems: 'center',
    background: theme.palette.panelBackground.default,
    padding: 8,
    marginBottom: 3,
    borderRadius: 2,
  },
  dialogueUserRowExpandedMobile: {
    [theme.breakpoints.down('xs')]: {
      display: 'block'
    }
  },
  dialogueLeftContainer: {
    display: 'flex',
    maxWidth: '135px',
    minWidth: '135px',
    [theme.breakpoints.down('xs')]: {
      maxWidth: '110px',
      minWidth: '110px',
    },
    alignItems: 'center',
  },
  dialogueLeftContainerExpandedMobile: {
    [theme.breakpoints.down('xs')]: {
      marginBottom: '7px',
    }
  },
  dialogueLeftContainerNoTopics: {
    maxWidth: '200px',
    minWidth: '200px',
  },
  dialogueMatchUsername: {
    marginRight: 10,
    '&&': {
      color: theme.palette.text.primary,
      textAlign: 'left'
    },
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    width: 'auto',
    flexShrink: 'unset!important',
  },
  dialogueMatchCheckbox: {
    marginLeft: 6,
    width: 29,
    '& label': {
      marginRight: 0
    }
  },
  debateTopicExpanded: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    paddingBottom: '10px',
    whiteSpace: 'normal',
    [theme.breakpoints.down('xs')]: {
      paddingLeft: '7px'
    }
  },
  debateTopicCollapsed: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  reactIcon: {
    paddingRight: "4px",
  },
  suggestionRow: {
    display: 'flex',
  },
  agreeText: {
    color: theme.palette.text.dim3,
  },
  agreeTextCollapsedMobile: {
    [theme.breakpoints.down('xs')]: {
      display: 'none'
    },
  },
  topicRecommendationsList: {
    fontFamily: theme.palette.fonts.sansSerifStack,
    color: theme.palette.text.primary,
    fontSize: 'small',
    overflow: 'hidden',
    justifyContent: 'space-between'
  },
  expandIcon: {
    cursor: 'pointer',
    minWidth: '70px',
    color: theme.palette.text.dim3,
    fontFamily: theme.palette.fonts.sansSerifStack,
    [theme.breakpoints.down('xs')]: {
      marginLeft: 'auto',
      minWidth: '25px',
    },
  },
  hideIcon: {
    cursor: 'pointer',
    minWidth: '70px',
    [theme.breakpoints.down('xs')]: {
      marginLeft: 'auto',
      minWidth: '25px',
    },
    color: theme.palette.text.dim3,
    fontFamily: theme.palette.fonts.sansSerifStack,
  },
  dialogueRightContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginLeft: 'auto',
  },
  dialogueMatchNote: {
    [theme.breakpoints.down('xs')]: {
      display: 'none'
    }
  },
  bigScreenExpandNote: {
    [theme.breakpoints.down('xs')]: {
      display: 'none'
    }
  }
});

interface DialogueRecommendationRowProps {
  rowProps: DialogueUserRowProps<boolean>; 
  classes: ClassesType<typeof styles>; 
  showSuggestedTopics: boolean;
}

// Future TODO: unify this with the server type TopicRecommendation? The problem is that returns a whole DbComment, rather than just contents and id. 
interface TopicRecommendationWithContents {
  comment: {
    _id: string;
    contents: {
      html: string;
      plaintextMainText: string;
    };
  };
  recommendationReason: string;
  yourVote: string;
  theirVote: string;
}

const DialogueRecommendationRow = ({ rowProps, classes, showSuggestedTopics }: DialogueRecommendationRowProps) => {
  const { DialogueCheckBox, UsersName, PostsItem2MetaInfo, LWTooltip, ReactionIcon } = Components

  const { targetUser, checkId, userIsChecked, userIsMatched } = rowProps;
  const { captureEvent } = useTracking(); //it is virtuous to add analytics tracking to new components
  const currentUser = useCurrentUser();
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
    captureEvent("toggle_expansion_reciprocity")
  };

  const { loading, error, data: topicData } = useQuery(gql`
    query getTopicRecommendations($userId: String!, $targetUserId: String!, $limit: Int!) {
      GetTwoUserTopicRecommendations(userId: $userId, targetUserId: $targetUserId, limit: $limit) {
        comment {
          _id
          contents {
            html
            plaintextMainText
          }
        }
        recommendationReason
        yourVote
        theirVote
      }
    }
  `, {
    variables: { userId: currentUser?._id, targetUserId: targetUser._id, limit:4 },
    skip: !currentUser
  });

  if (!currentUser) return <></>;
  const preTopicRecommendations: TopicRecommendationWithContents[] | undefined = topicData?.GetTwoUserTopicRecommendations; 
  const topicRecommendations = preTopicRecommendations?.filter(topic => topic.theirVote !== null);
  const numRecommendations = topicRecommendations?.length ?? 0;
  const numShown = isExpanded ? numRecommendations : 1
  const numHidden = Math.max(0, numRecommendations - numShown);

  const renderExpandCollapseText = () => {
    if (isExpanded) {
      return '▲ hide';
    }
  
    if (numHidden > 0) {
      return [
        '▼',
        <span key={targetUser._id} className={classes.bigScreenExpandNote}>
          ... {numHidden} more
        </span>,
      ];
    }
  
    return '';
  };

  return (
    <div>
      <div key={targetUser._id} className={classNames(classes.dialogueUserRow, {
          [classes.dialogueUserRowExpandedMobile]: isExpanded
        })}>
          <div className={classNames(classes.dialogueLeftContainer, {
            [classes.dialogueLeftContainerExpandedMobile]: isExpanded,
            [classes.dialogueLeftContainerNoTopics]: isExpanded || numRecommendations === 0
          })}>
          <div className={ classes.dialogueMatchCheckbox }>
            <DialogueCheckBox
              targetUserId={targetUser._id}
              targetUserDisplayName={targetUser.displayName}
              checkId={checkId}
              isChecked={userIsChecked}
              isMatched={userIsMatched}
            />
          </div>
          <PostsItem2MetaInfo className={classes.dialogueMatchUsername}>
            <UsersName
              documentId={targetUser._id}
              simple={false}
            />
          </PostsItem2MetaInfo>
        </div>
        {showSuggestedTopics && <div className={classes.topicRecommendationsList}>
          {topicRecommendations?.slice(0,numShown).map((topic, index) => (
            <div key={index} className={classes.suggestionRow}>
              <p key={index} className={classNames({
                [classes.debateTopicExpanded]: isExpanded,
                [classes.debateTopicCollapsed]: !isExpanded
              })}>
                {topic.theirVote === 'agree' && [
                  <ReactionIcon key={index} size={13} react={"agree"} />,
                  <span key={index} className={classNames(classes.agreeText, {
                    [classes.agreeTextCollapsedMobile]: !isExpanded
                  })}>agrees: </span>,
                  `"${topic.comment.contents.plaintextMainText}"`
                ]} 
                {topic.theirVote === 'disagree' && [
                  <ReactionIcon key={index} size={13} react={"disagree"} />,
                  <span key={index} className={classNames(classes.agreeText, {
                    [classes.agreeTextCollapsedMobile]: !isExpanded
                  })}>disagrees: </span>,
                  `"${topic.comment.contents.plaintextMainText}"`
                ]}
              </p>
            </div>
          ))}
          
      </div>}
      <div className={classes.dialogueRightContainer}>
        {<span className={classNames({
          [classes.hideIcon]: isExpanded,
          [classes.expandIcon]: !isExpanded
        })} onClick={toggleExpansion}>
          {renderExpandCollapseText()}
        </span>}
      </div>
      {!showSuggestedTopics && 
        <PostsItem2MetaInfo className={classes.dialogueMatchNote}>
          <div className={classes.dialogueMatchNote}>Check to maybe dialogue, if you find a topic</div>
        </PostsItem2MetaInfo>}
      </div>
    </div>
  );
};

const DialogueRecommendationRowComponent = registerComponent('DialogueRecommendationRow', DialogueRecommendationRow, {styles});

declare global {
  interface ComponentTypes {
    DialogueRecommendationRow: typeof DialogueRecommendationRowComponent
  }
}
