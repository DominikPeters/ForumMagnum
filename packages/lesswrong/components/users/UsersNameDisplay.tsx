import React, { useContext, createContext } from 'react';
import { registerComponent, Components } from '../../lib/vulcan-lib';
import { userGetDisplayName, userGetProfileUrl } from '../../lib/collections/users/helpers';
import { Link } from '../../lib/reactRouterWrapper';
import { useHover } from '../common/withHover'
import classNames from 'classnames';
import { AnalyticsContext } from "../../lib/analyticsEvents";
import { useCurrentUser } from '../common/withUser';
import type { PopperPlacementType } from '@material-ui/core/Popper'

const styles = (theme: ThemeType): JssStyles => ({
  color: {
    color: theme.palette.primary.main,
  },
  noColor: {
    color: "inherit !important"
  }
})

type DisableNoKibitzContextType = {disableNoKibitz: boolean, setDisableNoKibitz: (disableNoKibitz: boolean)=>void};
export const DisableNoKibitzContext = createContext<DisableNoKibitzContextType >({disableNoKibitz: false, setDisableNoKibitz: ()=>{}});

/**
 * Given a user (which may not be null), render the user name as a link with a
 * tooltip. This should not be used directly; use UsersName instead.
 */
const UsersNameDisplay = ({user, color=false, nofollow=false, simple=false, classes, tooltipPlacement = "left", className}: {
  user: UsersMinimumInfo|null|undefined,
  color?: boolean,
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
    return <Components.UserNameDeleted userShownToAdmins={user}/>
  }
  const { UserTooltip, LWTooltip } = Components
  
  const displayName = noKibitz ? "(hidden)" : userGetDisplayName(user);
  const colorClass = color?classes.color:classes.noColor;

  if (simple) {
    return <span {...eventHandlers} className={classNames(colorClass, className)}>
      {displayName}
    </span>
  }

  return <span {...eventHandlers} className={className}>
    <AnalyticsContext pageElementContext="userNameDisplay" userIdDisplayed={user._id}>
    <LWTooltip title={<UserTooltip user={user}/>} placement={tooltipPlacement} inlineBlock={false}>
      <Link to={userGetProfileUrl(user)} className={colorClass}
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
