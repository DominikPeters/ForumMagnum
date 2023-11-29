import React from "react";
import { Components, registerComponent } from "../../../lib/vulcan-lib";
import { AnalyticsContext } from "../../../lib/analyticsEvents";
import { votingPortalStyles } from "./styles";
import { useCurrentUser } from "../../common/withUser";
import { isAdmin } from "../../../lib/vulcan-users";
import { useLocation } from "../../../lib/routeUtil";
import { makeCloudinaryImageUrl } from "../../common/CloudinaryImage2";
import { votingThankYouImageId } from "../../../lib/eaGivingSeason";
import Helmet from "react-helmet";
import classNames from "classnames";
import { useElectionVote } from "./hooks";

const BACKGROUND_IMAGE = makeCloudinaryImageUrl(votingThankYouImageId, {
  q: "100",
  f: "auto",
  c: "fill",
  g: "center",
});

const styles = (theme: ThemeType) => ({
  ...votingPortalStyles(theme),
  layout: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  introBackground: {
    backgroundColor: theme.palette.givingPortal.votingPortalIntroBackground,
  },
  thankYouBackground: {
    backgroundImage: `url(${BACKGROUND_IMAGE})`,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "auto",
  },
});

const EAVotingPortalPage = ({classes}: {
  classes: ClassesType<typeof styles>,
}) => {
  const { Loading, VotingPortalIntro, VotingPortalThankYou } = Components;

  const {location: {search}} = useLocation();
  const params = new URLSearchParams(search);
  const { electionVote, loading } = useElectionVote("givingSeason23");
  const currentUser = useCurrentUser();

  if (loading) return <Loading />;

  const thankyouParam = params.get("thankyou");
  const isThankYouPage = thankyouParam === "true" || (!thankyouParam && !!electionVote?.submittedAt)

  // TODO un-admin-gate when the voting portal is ready
  if (!isAdmin(currentUser)) return null;

  return (
    <AnalyticsContext
      pageContext="eaVotingPortal"
      pageSectionContext={isThankYouPage ? "thankyou" : "intro"}
    >
      <Helmet>
        <link rel="preload" as="image" href={BACKGROUND_IMAGE} />
      </Helmet>
      <div className={classNames(classes.root, classes.layout, {
        [classes.introBackground]: !isThankYouPage,
        [classes.thankYouBackground]: isThankYouPage,
      })}>
        {isThankYouPage
          ? <VotingPortalThankYou currentUser={currentUser} />
          : <VotingPortalIntro />
        }
      </div>
    </AnalyticsContext>
  );
}

const EAVotingPortalPageComponent = registerComponent(
  "EAVotingPortalPage",
  EAVotingPortalPage,
  {styles},
);

declare global {
  interface ComponentTypes {
    EAVotingPortalPage: typeof EAVotingPortalPageComponent;
  }
}
