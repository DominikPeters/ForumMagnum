import React, { useCallback, useRef, useState, ChangeEvent } from "react";
import { Components, registerComponent } from "../../../lib/vulcan-lib";
import { gql, useQuery } from "@apollo/client";
import { Link } from "../../../lib/reactRouterWrapper";
import {
  isNotificationsPageTabName,
  notificationPageTabs,
  useNotificationsPageTab,
} from "./notificationsPageTabs";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import type { NotificationDisplay } from "../../../lib/notificationTypes";
import type { KarmaChanges } from "../../../lib/collections/users/karmaChangesGraphQL";

const styles = (theme: ThemeType) => ({
  root: {
    fontFamily: theme.palette.fonts.sansSerifStack,
    width: 760,
    maxWidth: "100%",
    margin: "0 auto",
  },
  tabs: {
    marginBottom: 24,
    "& .MuiTabs-flexContainer": {
      gap: "32px",
    },
    "& .MuiTab-root": {
      minWidth: 100,
      [theme.breakpoints.down("xs")]: {
        minWidth: 50,
      },
    },
    "& .MuiTab-labelContainer": {
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: "0.28px",
      textTransform: "uppercase",
    },
  },
  karmaBatching: {
    marginBottom: 32,
    "& a": {
      color: theme.palette.grey[600],
      fontSize: 14,
      fontWeight: 600,
    },
  },
});

// We have to do this manually outside of `usePaginatedResolver` because the
// return type is pure unadulterated JSON, not a registered fragment type
const query = gql`
  query getNotificationDisplays($limit: Int, $type: String) {
    NotificationDisplays(limit: $limit, type: $type) {
      results
    }
  }
`;

const DEFAULT_LIMIT = 20;

export const NotificationsPageFeed = ({
  karmaChanges,
  currentUser,
  classes,
}: {
  karmaChanges?: KarmaChanges,
  currentUser: UsersCurrent,
  classes: ClassesType<typeof styles>,
}) => {
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const {tab, setTab} = useNotificationsPageTab();

  const {
    data,
    error,
    loading,
    networkStatus,
  } = useQuery(query, {
    ssr: true,
    notifyOnNetworkStatusChange: true,
    skip: !currentUser,
    pollInterval: 0,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-only",
    variables: {
      type: tab.type,
      limit,
    },
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Error loading notifications:", error);
  }

  const loadMore = useCallback(() => {
    setLimit((currentLimit) => currentLimit + DEFAULT_LIMIT);
  }, []);

  const notifications = useRef<NotificationDisplay[]>([]);
  if (data?.NotificationDisplays?.results && !loading) {
    notifications.current = data.NotificationDisplays.results;
  }

  const canLoadMore = notifications.current.length > 0;
  const hasKarmaChanges = Boolean(
    karmaChanges?.posts?.length ||
    karmaChanges?.comments?.length ||
    karmaChanges?.tagRevisions?.length
  );
  const showKarmaChanges = hasKarmaChanges && tab.name === "all";

  const onChangeTab = useCallback((_: ChangeEvent, tabName: string) => {
    if (isNotificationsPageTabName(tabName)) {
      notifications.current = [];
      setLimit(DEFAULT_LIMIT);
      setTab(tabName);
    }
  }, [setTab]);

  const {
    NotificationsPageNotification, NotificationsPageKarmaChange,
    NotificationsPageEmpty, LoadMore, Loading, SectionTitle,
  } = Components;
  return (
    <div className={classes.root}>
      <Tabs
        value={tab.name}
        onChange={onChangeTab}
        className={classes.tabs}
        textColor="primary"
        aria-label="select notification type"
        scrollable
        scrollButtons="off"
      >
        {notificationPageTabs.map(({name}) => (
          <Tab label={name} value={name} key={name} />
        ))}
      </Tabs>
      {showKarmaChanges &&
        <>
          <SectionTitle title="Karma changes" />
          {karmaChanges?.posts?.map((karmaChange) =>
            <NotificationsPageKarmaChange
              key={karmaChange._id}
              postKarmaChange={karmaChange}
            />
          )}
          {karmaChanges?.comments?.map((karmaChange) =>
            <NotificationsPageKarmaChange
              key={karmaChange._id}
              commentKarmaChange={karmaChange}
            />
          )}
          {karmaChanges?.tagRevisions?.map((karmaChange) =>
            <NotificationsPageKarmaChange
              key={karmaChange._id}
              tagRevisionKarmaChange={karmaChange}
            />
          )}
          <div className={classes.karmaBatching}>
            <Link to="/account">Change settings</Link>
          </div>
          <SectionTitle title="All other" />
        </>
      }
      {notifications.current.length === 0 && !loading &&
        <NotificationsPageEmpty tabName={tab.name} />
      }
      {notifications.current.map((notification) => (
        <NotificationsPageNotification
          key={notification._id}
          notification={notification}
        />
      ))}
      {loading && notifications?.current?.length === 0 && <Loading />}
      {canLoadMore &&
        <LoadMore
          loadMore={loadMore}
          loading={loading}
          networkStatus={networkStatus}
        />
      }
    </div>
  );
}

const NotificationsPageFeedComponent = registerComponent(
  "NotificationsPageFeed",
  NotificationsPageFeed,
  {styles},
);

declare global {
  interface ComponentTypes {
    NotificationsPageFeed: typeof NotificationsPageFeedComponent
  }
}
