import React, { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { Components, registerComponent } from "../../../lib/vulcan-lib";
import { useElectionCandidates } from "../giving-portal/hooks";
import classNames from "classnames";
import { AnalyticsContext } from "../../../lib/analyticsEvents";
import { Link } from "../../../lib/reactRouterWrapper";
import { imageSize } from "../giving-portal/ElectionCandidate";
import OutlinedInput from "@material-ui/core/OutlinedInput";
import { numberToEditableString } from "../../../lib/collections/electionVotes/helpers";
import { votingPortalStyles } from "./styles";
import stringify from "json-stringify-deterministic";

const styles = (theme: ThemeType) => ({
  ...votingPortalStyles(theme),
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "16px",
  },
  table: {
    display: "flex",
    flexWrap: "wrap",
    width: "100%",
  },
  controls: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
  },
  dropdown: {
    "& .ForumDropdownMultiselect-button": {
      color: theme.palette.givingPortal[1000],
      fontSize: 16,
      "&:hover": {
        backgroundColor: theme.palette.givingPortal.candidate,
      },
    },
  },
  hr: {
    width: "100%",
    height: 1,
    backgroundColor: theme.palette.grey[600],
    opacity: 0.2,
    border: "none",
    margin: 0,
  },
  allocateVoteRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: 12,
    justifyContent: "space-between",
    [theme.breakpoints.down("xs")]: {
      flexDirection: "column",
      alignItems: "flex-start",
      padding: '16px 8px'
    },
  },
  details: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  imageContainer: {
    borderRadius: theme.borderRadius.small,
    backgroundColor: theme.palette.grey[0],
    width: imageSize,
    height: imageSize,
  },
  image: {
    borderRadius: theme.borderRadius.small,
    objectFit: "cover",
    width: imageSize,
    height: imageSize,
  },
  candidateName: {
    fontWeight: 600,
    fontSize: 18,
    color: theme.palette.givingPortal[1000],
  },
  allocateInput: {
    width: 150,
    height: 48,
    "& input": {
      textAlign: "right",
      fontSize: 18,
      fontWeight: 500,
      color: theme.palette.grey[1000],
      zIndex: theme.zIndexes.singleColumnSection
    },
    "& .MuiNotchedOutline-focused": {
      border: `2px solid ${theme.palette.givingPortal[1000]} !important`
    },
    "& .MuiNotchedOutline-root": {
      backgroundColor: theme.palette.grey[100],
      border: "none"
    },
    [theme.breakpoints.down("xs")]: {
      width: "100%",
    },
  },
  sortButton: {
    padding: "6px 12px",
    marginLeft: 6,
  }
});

const AllocateVoteRow = ({
  candidate,
  voteState,
  setVoteState,
  classes,
}: {
  candidate: ElectionCandidateBasicInfo;
  voteState: Record<string, number | string | null>;
  setVoteState: Dispatch<SetStateAction<Record<string, number | string | null>>>;
  classes: ClassesType<typeof styles>;
}) => {
  const { _id: candidateId, name, logoSrc, fundraiserLink } = candidate;
  const naiveValue = voteState[candidateId];
  const formattedValue =
    typeof naiveValue === "number"
      ? numberToEditableString(naiveValue, 15)
      : voteState[candidateId] ?? "";

  return (
    <AnalyticsContext pageElementContext="allocateVoteRow">
      <div className={classes.allocateVoteRow}>
        <div className={classes.details}>
          <div className={classes.imageContainer}>
            <Link to={fundraiserLink || ""} target="_blank" rel="noopener noreferrer">
              <img src={logoSrc} className={classes.image} />
            </Link>
          </div>
          <Link to={fundraiserLink || ""} className={classes.candidateName} target="_blank" rel="noopener noreferrer">
            {name}
          </Link>
        </div>
        <OutlinedInput
          className={classes.allocateInput}
          labelWidth={0}
          value={formattedValue}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "" || value === null) {
              setVoteState((prev) => ({ ...prev, [candidateId]: null } as Record<string, number | string | null>));
            } else if (/^\d*\.?\d*$/.test(value) && value.length < 15) { // Only allow positive (decimal) numbers up to 15 characters
              setVoteState((prev) => ({ ...prev, [candidateId]: value } as Record<string, number | string | null>));
            }
          }}
          type="string"
        />
      </div>
    </AnalyticsContext>
  );
};

const sortBy = "random";

const ElectionAllocateVote = ({
  voteState,
  setVoteState,
  className,
  classes,
}: {
  voteState: Record<string, number | string | null>;
  setVoteState: Dispatch<SetStateAction<Record<string, number | string | null>>>;
  className?: string;
  classes: ClassesType<typeof styles>;
}) => {
  const { results, loading } = useElectionCandidates(sortBy);
  const [displayedResults, setDisplayedResults] = useState<ElectionCandidateBasicInfo[]>([]);

  const selectedResults = useMemo(
    () => results?.filter((candidate) => voteState[candidate._id] !== undefined),
    [results, voteState]
  );
  const sortedResults = useMemo(
    () =>
      selectedResults?.slice().sort((a, b) => {
        const numericalVoteState = Object.fromEntries(
          // Treate 0, "0", null etc all as null
          Object.entries(voteState).map(([id, value]) => [id, value ? parseFloat(value as string) : null])
        );

        const aValue = numericalVoteState[a._id] ?? 0;
        const bValue = numericalVoteState[b._id] ?? 0;

        return bValue - aValue;
      }),
    [selectedResults, voteState]
  );
  const canUpdateSort = useMemo(
    () => stringify(sortedResults?.map((r) => r._id)) !== stringify(displayedResults?.map((r) => r._id)),
    [sortedResults, displayedResults]
  );

  const updateSort = useCallback(() => {
    if (!sortedResults) return;

    setDisplayedResults(sortedResults);
  }, [sortedResults]);

  useEffect(() => {
    if (!displayedResults.length && sortedResults?.length) {
      updateSort();
    }
  }, [displayedResults, sortedResults, updateSort]);

  const { Loading } = Components;
  return (
    <div className={classNames(classes.root, className)}>
      <div className={classes.controls}>
        <button
          className={classNames(classes.button, classes.sortButton, {
            [classes.buttonDisabled]: !canUpdateSort,
          })}
          disabled={!canUpdateSort}
          onClick={updateSort}
        >
          Sort high to low
        </button>
      </div>
      <div className={classes.table}>
        {loading && <Loading />}
        {displayedResults?.map((candidate, index) => (
          <React.Fragment key={candidate._id}>
            <AllocateVoteRow
              candidate={candidate}
              voteState={voteState}
              setVoteState={setVoteState}
              classes={classes}
            />
            {index < displayedResults.length - 1 && <hr className={classes.hr} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const ElectionAllocateVoteComponent = registerComponent("ElectionAllocateVote", ElectionAllocateVote, {
  styles,
  stylePriority: -1,
});

declare global {
  interface ComponentTypes {
    ElectionAllocateVote: typeof ElectionAllocateVoteComponent;
  }
}
