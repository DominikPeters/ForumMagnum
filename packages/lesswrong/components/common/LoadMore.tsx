import { registerComponent, Components } from '../../lib/vulcan-lib';
import React, { useState } from 'react';
import classNames from 'classnames';
import { queryIsUpdating } from './queryStatusUtils'
import {useTracking} from "../../lib/analyticsEvents";
import { LoadMoreCallback } from '../../lib/crud/withMulti';
import { useIsFirstRender } from "../hooks/useFirstRender";

const styles = (theme: ThemeType): JssStyles => ({
  root: {
    ...theme.typography.body2,
    ...theme.typography.commentStyle,
    color: theme.palette.lwTertiary.main,
    display: "inline-block",
    minHeight: 20,
  },
  afterPostsListMarginTop: {
    marginTop: 6,
  },
  loading: {
    minHeight: 20,
  },
  disabled: {
    color: theme.palette.grey[400],
    cursor: 'default',
    '&:hover': {
      opacity: 1
    }
  },
  sectionFooterStyles: {
    // This is an artifact of how SectionFooter is currently implemented, which should probably change.
    flexGrow: 1,
    textAlign: "left !important",
    marginLeft: "0 !important", // for loading spinner
    '&:after': {
      content: "'' !important",
      marginLeft: "0 !important",
      marginRight: "0 !important",
    }
  }
})


/**
 * Load More button. The simplest way to use this is to take `loadMoreProps`
 * from the return value of `useMulti` and spread it into this component's
 * props.
 */
const LoadMore = ({
  loadMore,
  count,
  totalCount,
  className=null,
  loadingClassName,
  disabled=false,
  networkStatus,
  loading=false,
  hideLoading=false,
  hidden=false,
  classes,
  sectionFooterStyles,
  afterPostsListMarginTop,
  message="Load More",
}: {
  // loadMore: Callback when clicked.
  loadMore: LoadMoreCallback,
  // count/totalCount: If provided, looks like "Load More (10/25)"
  count?: number,
  totalCount?: number,
  // className: If provided, replaces the root style (default typography).
  className?: string|null|undefined,
  loadingClassName?: string,
  // disabled: If true, this is grayed out (eg because everything's already loaded).
  disabled?: boolean,
  networkStatus?: any,
  loading?: boolean,
  // hideLoading: Reserve space for the load spinner as normal, but don't show it
  hideLoading?: boolean,
  hidden?: boolean,
  classes: ClassesType,
  sectionFooterStyles?: boolean,
  afterPostsListMarginTop?: boolean,
  message?: string,
}) => {
  const { captureEvent } = useTracking()
  const [loadMorePromisePending,setLoadMorePromisePending] = useState(false);

  /**
   * To avoid hydration errors, set loading to false if this is the initial render and we have
   * a non-zero count that graphql cached during SSR.
   */
  const isFirstRender = useIsFirstRender();
  loading = loading && !(isFirstRender && (count ?? 0) > 0);

  const { Loading } = Components
  const handleClickLoadMore = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    captureEvent("loadMoreClicked")
    const loadMoreResult = loadMore();

    if(loadMorePromisePending)
      return;

    if (loadMoreResult) {
      // If loadMore returned something that isn't falsy, it's a promise, and we
      // (a) force the loading-state indicator to display, and (b) block
      // additional clicks, until the promise resolves.
      setLoadMorePromisePending(true);
      void (async () => {
        await loadMoreResult;
        setLoadMorePromisePending(false);
      })();
    }
  }

  if (!hideLoading && (loading || loadMorePromisePending || (networkStatus && queryIsUpdating(networkStatus)))) {
    return <Loading className={classNames(classes.loading, loadingClassName, {[classes.sectionFooterStyles]: sectionFooterStyles})} />
  }

  if (hidden) return null;

  return (
    <a
      className={classNames(classes.root, className, {
        [classes.disabled]: disabled,
        [classes.sectionFooterStyles]: sectionFooterStyles,
        [classes.afterPostsListMarginTop]: afterPostsListMarginTop,
      })}
      href="#"
      onClick={handleClickLoadMore}
    >
      {totalCount ? `${message} (${count}/${totalCount})` : `${message}`}
    </a>
  )
}

const LoadMoreComponent = registerComponent('LoadMore', LoadMore, {styles, stylePriority: -1});

declare global {
  interface ComponentTypes {
    LoadMore: typeof LoadMoreComponent
  }
}
