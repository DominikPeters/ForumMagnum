import React, { useState } from 'react';
import { Components, registerComponent } from '../../lib/vulcan-lib';
import { UserVoteOnSingleReaction, VoteOnReactionType } from '../../lib/voting/namesAttachedReactions';
import { namesAttachedReactions, NamesAttachedReactionType } from '../../lib/voting/reactions';
import classNames from 'classnames';

const styles = (theme: ThemeType): JssStyles => ({
  moreReactions: {
    paddingLeft: 12,
    paddingRight: 12,
  },
  searchBox: {
    border: theme.palette.border.faint,
    borderRadius: 3,
    width: "100%",
    padding: 4,
    marginBottom: 12,
    background: theme.palette.panelBackground.default,

    "&:focus": {
      border: theme.palette.border.normal,
    },
  },
  hoverBallotLabel: {
    marginLeft: 10,
    verticalAlign: "middle",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexGrow: 1
  },
  numQuotes: {
    fontSize: 10,
    marginRight: 6
  },
  paletteEntry: {
    cursor: "pointer",
    width: 150,
    padding: 4,
    display: "flex",
    alignItems: "center",
    "&:hover": {
      background: theme.palette.panelBackground.darken04,
    },
  },
  paletteIcon1: {
    cursor: "pointer",
    padding: 6,
    "&:hover": {
      background: theme.palette.panelBackground.darken04,
    },
  },
  paletteIcon2: {
    cursor: "pointer",
    padding: 6,
    textAlign: "center",
    width: 54,
    height: 50,
    "&:hover": {
      background: theme.palette.panelBackground.darken04,
    },
  },
  selected: {
    background: theme.palette.panelBackground.darken10,
  },
  selectedAnti: {
    background: "rgb(255, 189, 189, .23)",
  },
  reactionDescription: {
  },
  reactionPaletteScrollRegion: {
    width: 350,
    maxHeight: 240,
    overflowY: "scroll",
    marginBottom: 12,
    marginTop: 12
  },
  quickReactBar: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    paddingBottom: 8
  },
  tooltipIcon: {
    marginRight: 12,
  },
  showAll: {
    maxHeight: "none",
  },
  toggleIcon: {
    cursor: "pointer",
    height: 18
  },
  tinyLabel: {
    marginTop: 4,
    fontSize: 8,
    color: theme.palette.grey[900],
    wordBreak: "break-word",
  }, 
  showMore: {
    display: "flex",
    justifyContent: "center",
    paddingBottom: 6,
  },
  warning: {
    color: theme.palette.error.main
  }
})

const ReactionsPalette = ({getCurrentUserReaction, getCurrentUserReactionVote, toggleReaction, quote, classes}: {
  getCurrentUserReaction: (name: string) => UserVoteOnSingleReaction|null,
  getCurrentUserReactionVote: (name: string) => VoteOnReactionType|null,
  toggleReaction: (reactionName: string, quote?: string)=>void,
  quote?: string,
  classes: ClassesType,
}) => {
  const { ReactionIcon, LWTooltip, Row, MetaInfo } = Components;
  const [searchText,setSearchText] = useState("");
  const [showAll, setShowAll] = useState(false);
  
  const reactionsToShow = reactionsSearch(namesAttachedReactions, searchText);

  function tooltip (reaction: NamesAttachedReactionType) {
    return <Row>
     <div className={classes.tooltipIcon}>
        <ReactionIcon inverted={true} react={reaction.name} size={40}/>
      </div>
      <div>
        <span>{reaction.label}</span>
        <ReactionDescription reaction={reaction} classes={classes}/>
        {reaction.deprecated && "This react has been deprecated and may be removed later"}
      </div>
    </Row>
  }

  const N = 9; // number of reaction icons that fit on a line
  const numRowsToShow = 4;
  const mixedIconReactions = reactionsToShow.slice(0, Math.min(N * numRowsToShow, reactionsToShow.length));

  return <div className={classes.moreReactions}>
    {quote && <p>Reacting to "{quote}"</p>}
    <div className={classes.searchBoxWrapper}>
      <input
        type="text" className={classes.searchBox}
        value={searchText}
        placeholder="Search"
        onChange={(ev) => setSearchText(ev.currentTarget.value)}
      />
    </div>
    <div>
      <div>
        {mixedIconReactions.map(reaction => <LWTooltip title={tooltip(reaction)} 
          key={`icon-${reaction.name}`}
        >
          <div className={classes.paletteIcon1} onClick={_ev => toggleReaction(reaction.name, quote)}>
            <ReactionIcon react={reaction.name} size={24}/>
          </div>
        </LWTooltip>)}
      </div>
      <div className={classNames(classes.reactionPaletteScrollRegion, {[classes.showAll]: showAll})}>
        {reactionsToShow.map(reaction => {
          const currentUserVote = getCurrentUserReactionVote(reaction.name);
          const currentUserReact = getCurrentUserReaction(reaction.name);
          const voteQuotes = currentUserReact?.quotes ?? [];
          return (
            <LWTooltip
              key={reaction.name} placement="right-start"
              title={tooltip(reaction)}
            >
              <div
                key={reaction.name}
                className={classNames(classes.paletteEntry, {
                  [classes.selected]: (currentUserVote==="created" || currentUserVote==="seconded"),
                  [classes.selectedAnti]: currentUserVote==="disagreed",
                })}
                onClick={_ev => toggleReaction(reaction.name, quote)}
              >
                <ReactionIcon react={reaction.name}/>
                <span className={classes.hoverBallotLabel}>{reaction.label}{voteQuotes.length > 0 && <span className={classes.numQuotes}>{voteQuotes.length}</span>}</span>
              </div>
            </LWTooltip>
          )
        })}
      </div>
      <a onClick={() => setShowAll(!showAll)} className={classes.showMore}>
        <MetaInfo>{showAll ? "Show Fewer" : "Show More"}</MetaInfo>
      </a>
    </div>
  </div>
}

const ReactionDescription = ({reaction, classes}: {
  reaction: NamesAttachedReactionType,
  classes: ClassesType,
}) => {
  if (!reaction.description) {
    return null;
  } else if (typeof reaction.description === "string") {
    return <div className={classes.reactionDescription}>{reaction.description}</div>
  } else {
    return <div className={classes.reactionDescription}>{reaction.description("comment")}</div>
  }
}

function reactionsSearch(candidates: NamesAttachedReactionType[], searchText: string): NamesAttachedReactionType[] {
  if (!searchText || !searchText.length)
    return candidates;
  
  searchText = searchText.toLowerCase();

  return candidates.filter(
    reaction => reaction.name.toLowerCase().startsWith(searchText)
      || reaction.label.toLowerCase().startsWith(searchText)
      || reaction.searchTerms?.some(searchTerm => searchTerm.toLowerCase().startsWith(searchText))
  );
}


const ReactionsPaletteComponent = registerComponent('ReactionsPalette', ReactionsPalette, {styles});

declare global {
  interface ComponentTypes {
    ReactionsPalette: typeof ReactionsPaletteComponent
  }
}

