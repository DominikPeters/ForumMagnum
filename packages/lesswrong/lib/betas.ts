// Centralized control of beta-gated features. If a feature is restricted to
// admins or to users with the opt-in flag, implement that by defining a
// function here which returns whether a given user has access to that feature.
// That way, we can look here to see what features are currently beta-gated,
// and have an easy way to un-gate in all the relevant places at once.
//
// Beta-feature test functions must handle the case where user is null.

import {
  testServerSetting,
  isEAForum,
  isLWorAF,
  hasCommentsTableOfContentSetting,
  hasSideCommentsSetting, 
  hasDialoguesSetting, 
  hasPostInlineReactionsSetting,
  isLW,
} from './instanceSettings'
import { userOverNKarmaOrApproved } from "./vulcan-users/permissions";
import {isFriendlyUI} from '../themes/forumTheme'

// States for in-progress features
const adminOnly = (user: UsersCurrent|DbUser|null): boolean => !!user?.isAdmin; // eslint-disable-line no-unused-vars
const moderatorOnly = (user: UsersCurrent|DbUser|null): boolean => !!(user?.isAdmin || user?.groups?.includes('sunshineRegiment'))
const optInOnly = (user: UsersCurrent|DbUser|null): boolean => !!user?.beta; // eslint-disable-line no-unused-vars
const shippedFeature = (user: UsersCurrent|DbUser|null): boolean => true; // eslint-disable-line no-unused-vars
const disabled = (user: UsersCurrent|DbUser|null): boolean => false; // eslint-disable-line no-unused-vars
const testServerOnly = (_: UsersCurrent|DbUser|null): boolean => testServerSetting.get();
const adminOrBeta = (user: UsersCurrent|DbUser|null): boolean => adminOnly(user) || optInOnly(user);

//////////////////////////////////////////////////////////////////////////////
// Features in progress                                                     //
//////////////////////////////////////////////////////////////////////////////

export const userCanEditTagPortal = isEAForum ? moderatorOnly : adminOnly;
export const userHasBoldPostItems = disabled
export const userHasEAHomeHandbook = adminOnly
export const userCanCreateCommitMessages = moderatorOnly;
export const userHasRedesignedSettingsPage = disabled;
export const userCanUseSharing = (user: UsersCurrent|DbUser|null): boolean => moderatorOnly(user) || userOverNKarmaOrApproved(1)(user);
export const userHasNewTagSubscriptions =  isEAForum ? shippedFeature : disabled
export const userHasDefaultProfilePhotos = disabled

export const userHasAutosummarize = adminOnly

export const userHasThemePicker = isFriendlyUI ? adminOnly : shippedFeature;

export const userHasShortformTags = isEAForum ? shippedFeature : disabled;

export const userHasCommentProfileImages = disabled;

export const userHasEagProfileImport = disabled;

export const userHasEAHomeRHS = isEAForum ? shippedFeature : disabled;

export const userHasPopularCommentsSection = isEAForum ? shippedFeature : disabled;

export const visitorGetsDynamicFrontpage = isLW ? shippedFeature : disabled;

// Non-user-specific features
export const dialoguesEnabled = hasDialoguesSetting.get();
export const ckEditorUserSessionsEnabled = isLWorAF;
export const inlineReactsHoverEnabled = hasPostInlineReactionsSetting.get();
export const allowSubscribeToUserComments = true;
/** On the post page, do we show users other content they might want to read */
export const hasPostRecommendations = isEAForum;
/** Some Forums, notably the EA Forum, have a weekly digest that users can sign up to receive */
export const hasDigests = isEAForum;
export const hasSideComments = hasSideCommentsSetting.get();
export const useElicitApi = false;
export const commentsTableOfContentsEnabled = hasCommentsTableOfContentSetting.get();
export const fullHeightToCEnabled = isLWorAF;

// Shipped Features
export const userCanManageTags = shippedFeature;
export const userCanCreateTags = shippedFeature;
export const userCanUseTags = shippedFeature;
export const userCanViewRevisionHistory = shippedFeature;
export const userHasPingbacks = shippedFeature;
export const userHasElasticsearch = shippedFeature;
