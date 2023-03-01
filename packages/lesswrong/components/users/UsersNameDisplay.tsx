import React, { useState, useContext, createContext } from 'react';
import { registerComponent, Components } from '../../lib/vulcan-lib';
import { userGetDisplayName, userGetProfileUrl } from '../../lib/collections/users/helpers';
import { Link } from '../../lib/reactRouterWrapper';
import { useHover } from '../common/withHover'
import classNames from 'classnames';
import { AnalyticsContext } from "../../lib/analyticsEvents";
import { useCurrentUser } from '../common/withUser';
import type { PopperPlacementType } from '@material-ui/core/Popper'

const styles = (theme: ThemeType): JssStyles => ({
  userName: {
    color: "inherit !important"
  }
})

type DisableNoKibitzContextType = {disableNoKibitz: boolean, setDisableNoKibitz: (disableNoKibitz: boolean)=>void};
export const DisableNoKibitzContext = createContext<DisableNoKibitzContextType >({disableNoKibitz: false, setDisableNoKibitz: ()=>{}});

/**
 * Given a user (which may not be null), render the user name as a link with a
 * tooltip. This should not be used directly; use UsersName instead.
 */
const UsersNameDisplay = ({user, nofollow=false, simple=false, classes, tooltipPlacement = "left", className}: {
  user: UsersMinimumInfo|null|undefined,
  nofollow?: boolean,
  simple?: boolean,
  classes: ClassesType,
  tooltipPlacement?: PopperPlacementType,
  className?: string,
}) => {
  const {eventHandlers, hover} = useHover({pageElementContext: "linkPreview",  pageSubElementContext: "userNameDisplay", userId: user?._id})
  const currentUser = useCurrentUser();
  const {disableNoKibitz} = useContext(DisableNoKibitzContext);
  const noKibitz = (currentUser
    && (currentUser.noKibitz ?? false)
    && user
    && currentUser._id !== user._id  //don't nokibitz your own name
    && !disableNoKibitz
    && !hover
  );

  if (!user || user.deleted) {
    return <Components.UserNameDeleted/>
  }
  const { UserTooltip, LWTooltip } = Components
  
  const displayName = noKibitz ? "(hidden)" : userGetDisplayName(user);

  if (simple) {
    return <span {...eventHandlers} className={classNames(classes.userName, className)}>
      {displayName}
    </span>
  }

  return <span {...eventHandlers} className={className}>
    <AnalyticsContext pageElementContext="userNameDisplay" userIdDisplayed={user._id}>
    <LWTooltip title={<UserTooltip user={user}/>} placement={tooltipPlacement} inlineBlock={false}>
      <Link to={userGetProfileUrl(user)} className={classes.userName}
        {...(nofollow ? {rel:"nofollow"} : {})}
      >
        {displayName}
      </Link>
    </LWTooltip>
    </AnalyticsContext>
  </span>
}

const UsersNameDisplayComponent = registerComponent(
  'UsersNameDisplay', UsersNameDisplay, {styles}
);

declare global {
  interface ComponentTypes {
    UsersNameDisplay: typeof UsersNameDisplayComponent
  }
}
