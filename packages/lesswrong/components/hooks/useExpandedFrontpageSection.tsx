import { useState, useCallback } from "react";
import { useCurrentUser } from "../common/withUser";
import { useTracking } from "../../lib/analyticsEvents";
import { useCookiesWithConsent } from "./useCookiesWithConsent";
import { useMutation, gql } from "@apollo/client";
import moment from "moment";

export type ExpandedFrontpageSections = NonNullable<DbUser["expandedFrontpageSections"]>;
export type ExpandedFrontpageSection = keyof ExpandedFrontpageSections;
export type DefaultExpandedType = "all" | "none" | "loggedIn" | "loggedOut";

export type UseExpandedFrontpageSectionProps = {
  section: ExpandedFrontpageSection,
  defaultExpanded: DefaultExpandedType,
  onExpandEvent?: string,
  onCollapseEvent?: string,
  cookieName: string,
}

const expandFrontpageSectionMutation = gql`
  mutation UserExpandFrontpageSection($section: String!, $expanded: Boolean!) {
    UserExpandFrontpageSection(section: $section, expanded: $expanded)
  }
`;

const isDefaultExpanded = (
  currentUser: UsersCurrent | null,
  defaultExpanded: DefaultExpandedType,
): boolean => {
  switch (defaultExpanded) {
  case "none":
      return false;
  case "all":
      return true;
  case "loggedIn":
      return !!currentUser;
  case "loggedOut":
      return !currentUser;
  }
}

const isInitialExpanded = (
  section: ExpandedFrontpageSection,
  defaultExpanded: DefaultExpandedType,
  currentUser: UsersCurrent | null,
  cookies: Record<string, string>,
  cookieName: string,
): boolean => {
  if (cookies[cookieName]) {
    return cookies[cookieName] === "true";
  }
  const userExpand = currentUser?.expandedFrontpageSections?.[section];
  if (typeof userExpand === "boolean") {
    return userExpand;
  }
  return isDefaultExpanded(currentUser, defaultExpanded);
}

export const useExpandedFrontpageSection = ({
  section,
  defaultExpanded,
  onExpandEvent,
  onCollapseEvent,
  cookieName,
}: UseExpandedFrontpageSectionProps) => {
  const currentUser = useCurrentUser();
  const [expandFrontpageSection] = useMutation(
    expandFrontpageSectionMutation,
    {errorPolicy: "all"},
  );
  const {captureEvent} = useTracking();
  const [cookies, setCookie] = useCookiesWithConsent([cookieName]);
  const [expanded, setExpanded] = useState(
    () => isInitialExpanded(section, defaultExpanded, currentUser, cookies, cookieName),
  );

  const toggleExpanded = useCallback(() => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (currentUser) {
      void expandFrontpageSection({
        variables: {
          section,
          expanded: newExpanded,
        },
      });
    }
    if (cookieName) {
      setCookie(cookieName, String(newExpanded), {expires: moment().add(10, "years").toDate()});
    }
    const event = newExpanded ? onExpandEvent : onCollapseEvent;
    if (event) {
      captureEvent(event);
    }
  }, [
    section,
    onExpandEvent,
    onCollapseEvent,
    cookieName,
    expanded,
    currentUser,
    captureEvent,
    expandFrontpageSection,
    setCookie,
  ]);

  return {
    expanded,
    toggleExpanded,
  };
}
