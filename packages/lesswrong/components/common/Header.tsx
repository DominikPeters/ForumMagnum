import React, { useContext, useState, useCallback } from 'react';
import { Components, registerComponent } from '../../lib/vulcan-lib';
import { Link } from '../../lib/reactRouterWrapper';
import NoSSR from 'react-no-ssr';
import Headroom from '../../lib/react-headroom'
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import TocIcon from '@material-ui/icons/Toc';
import { useCurrentUser } from '../common/withUser';
import { SidebarsContext } from './SidebarsWrapper';
import withErrorBoundary from '../common/withErrorBoundary';
import classNames from 'classnames';
import { AnalyticsContext, useTracking } from '../../lib/analyticsEvents';
import { isEAForum, PublicInstanceSetting } from '../../lib/instanceSettings';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';
import { lightbulbIcon } from '../icons/lightbulbIcon';
import { cloudinaryCloudNameSetting } from '../../lib/publicSettings';
import { timelineSpec } from '../../lib/eaGivingSeason';
import moment from 'moment';
import { useLocation } from '../../lib/routeUtil';
import { useIsAboveBreakpoint } from '../hooks/useScreenWidth';
import { useCurrentTime } from '../../lib/utils/timeUtil';

export const forumHeaderTitleSetting = new PublicInstanceSetting<string>('forumSettings.headerTitle', "LESSWRONG", "warning")
export const forumShortTitleSetting = new PublicInstanceSetting<string>('forumSettings.shortForumTitle', "LW", "warning")
export const EA_FORUM_HEADER_HEIGHT = 66
export const EA_FORUM_GIVING_SEASON_HEADER_HEIGHT = 213

const cloudinaryCloudName = cloudinaryCloudNameSetting.get()
// special banner on EA Forum home page header for giving season
const gsImg = `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/c_crop,g_custom/h_300,q_100,f_auto/giving_portal_23_hero`

const styles = (theme: ThemeType): JssStyles => ({
  appBar: {
    boxShadow: theme.palette.boxShadow.appBar,
    color: theme.palette.header.text,
    backgroundColor: theme.palette.header.background,
    position: "static",
    width: "100%",
    display: "flex",
    zIndex: 1100,
    boxSizing: "border-box",
    flexShrink: 0,
    flexDirection: "column",
    ...(isEAForum ? {
      padding: '1px 20px',
      [theme.breakpoints.down('sm')]: {
        padding: '1px 11px',
      },
      [theme.breakpoints.down('xs')]: {
        padding: '9px 11px',
      },
    } : {})
  },
  root: {
    // This height (including the breakpoint at xs/600px) is set by Headroom, and this wrapper (which surrounds
    // Headroom and top-pads the page) has to match.
    height: isEAForum ? EA_FORUM_HEADER_HEIGHT : 64,
    [theme.breakpoints.down('xs')]: {
      height: isEAForum ? EA_FORUM_HEADER_HEIGHT : 56,
    },
    "@media print": {
      display: "none"
    }
  },
  titleSubtitleContainer: {
    display: 'flex',
    alignItems: 'center'
  },
  title: {
    flex: 1,
    position: "relative",
    top: 3,
    paddingRight: theme.spacing.unit,
    color: theme.palette.text.secondary,
  },
  titleLink: {
    color: theme.palette.header.text,
    fontSize: 19,
    '&:hover, &:focus, &:active': {
      textDecoration: 'none',
      opacity: 0.7,
    },
    display: 'flex',
    alignItems: 'center',
    fontWeight: isEAForum ? 400 : undefined,
  },
  menuButton: {
    marginLeft: -theme.spacing.unit,
    marginRight: theme.spacing.unit,
  },
  siteLogo: isEAForum ? {
    marginLeft:  -7,
    marginRight: 6,
    [theme.breakpoints.down('sm')]: {
      marginLeft: -12,
      marginRight: 3
    },
  } : {
    marginLeft: -theme.spacing.unit * 1.5,
  },
  hideLgUp: {
    [theme.breakpoints.up('lg')]: {
      display:"none"
    }
  },
  hideMdDown: {
    [theme.breakpoints.down('md')]: {
      display:"none"
    }
  },
  hideSmDown: {
    [theme.breakpoints.down('sm')]: {
      display: "none",
    },
  },
  hideXsDown: {
    [theme.breakpoints.down('xs')]: {
      display: "none",
    },
  },
  hideMdUp: {
    [theme.breakpoints.up('md')]: {
      display: "none",
    },
  },
  rightHeaderItems: {
    marginRight: -theme.spacing.unit,
    display: "flex",
    alignItems: isEAForum ? 'center' : undefined,
  },
  // Prevent rearranging of mobile header when search loads after SSR
  searchSSRStandin: {
    minWidth: 48
  },
  headroom: {
    // Styles for header scrolling, provided by react-headroom
    // https://github.com/KyleAMathews/react-headroom
    "& .headroom": {
      top: "unset",
      left: 0,
      right: 0,
      zIndex: 1300,
    },
    "& .headroom--unfixed": {
      position: "relative",
      transform: "translateY(0)",
    },
    "& .headroom--scrolled": {
      transition: "transform 200ms ease-in-out",
    },
    "& .headroom--unpinned": {
      position: "fixed",
      transform: "translateY(-100%)",
    },
    "& .headroom--pinned": {
      position: "fixed",
      transform: "translateY(0%)",
    },
  },
  headroomPinnedOpen: {
    "& .headroom--unpinned": {
      transform: "none !important",
    },
    "& .headroom--unfixed": {
      position: "fixed !important",
    },
  },
  
  // Below are custom styles for the special EA Forum Giving Season 2023 homepage header
  // TODO: delete after 2023
  rootGivingSeason: {
    height: EA_FORUM_GIVING_SEASON_HEADER_HEIGHT,
    [theme.breakpoints.down('sm')]: {
      height: EA_FORUM_HEADER_HEIGHT,
    },
    "& .headroom": {
      zIndex: theme.zIndexes.searchResults,
    },
  },
  appBarGivingSeason: {
    color: theme.palette.givingPortal.homepageHeader.light4,
    background: `center no-repeat url(${gsImg}), ${theme.palette.givingPortal.homepageHeader.dark}`,
    position: "static",
    width: "100%",
    height: EA_FORUM_GIVING_SEASON_HEADER_HEIGHT,
    display: "flex",
    zIndex: 1100,
    boxSizing: "border-box",
    flexShrink: 0,
    flexDirection: "column",
    padding: '1px 20px',
    '@media (max-width: 1200px)': {
      background: `right no-repeat url(${gsImg}), ${theme.palette.givingPortal.homepageHeader.dark}`,
    },
    [theme.breakpoints.down('sm')]: {
      height: EA_FORUM_HEADER_HEIGHT,
      padding: '1px 11px',
    },
    '@media (max-width: 840px)': {
      background: theme.palette.givingPortal.homepageHeader.main,
    },
    [theme.breakpoints.down('xs')]: {
      padding: '9px 11px',
    },
    
    "& .HeaderSubtitle-subtitle": {
      color: theme.palette.givingPortal.homepageHeader.light4,
    },
    "& .SearchBar-searchIcon": {
      color: theme.palette.givingPortal.homepageHeader.light4,
    },
    "& .ais-SearchBox-input": {
      color: theme.palette.givingPortal.homepageHeader.light4,
    },
    "& .ais-SearchBox-input::placeholder": {
      color: theme.palette.givingPortal.homepageHeader.light4,
    },
    "& .KarmaChangeNotifier-starIcon": {
      color: theme.palette.givingPortal.homepageHeader.light4,
    },
    "& .KarmaChangeNotifier-gainedPoints": {
      color: theme.palette.givingPortal.homepageHeader.light4,
    },
    "& .NotificationsMenuButton-badge": {
      color: theme.palette.givingPortal.homepageHeader.light4,
    },
    "& .NotificationsMenuButton-buttonClosed": {
      color: theme.palette.givingPortal.homepageHeader.light4,
    },
    "& .UsersMenu-arrowIcon": {
      color: theme.palette.givingPortal.homepageHeader.light4,
    },
    "& .EAButton-variantContained": {
      backgroundColor: theme.palette.givingPortal.homepageHeader.light2,
      color: theme.palette.givingPortal.homepageHeader.main,
      '&:hover': {
        backgroundColor: theme.palette.givingPortal.homepageHeader.light1,
      },
    },
    "& .EAButton-greyContained": {
      backgroundColor: theme.palette.givingPortal.homepageHeader.secondary,
      color: theme.palette.givingPortal.homepageHeader.light3,
      '&:hover': {
        backgroundColor: `${theme.palette.givingPortal.homepageHeader.secondaryDark} !important`,
      },
    },
  },
  toolbarGivingSeason: {
    zIndex: theme.zIndexes.spotlightItem
  },
  siteLogoGivingSeason: {
    width: 34,
    [theme.breakpoints.down('sm')]: {
      width: 30,
    },
  },
  titleLinkGivingSeason: {
    color: theme.palette.givingPortal.homepageHeader.light4,
  },
  givingSeasonSubtitle: {
    display: 'none',
    [theme.breakpoints.down('sm')]: {
      display: 'block',
      marginLeft: '1em',
      paddingLeft: '1em',
      borderLeft: `1px solid ${theme.palette.givingPortal.homepageHeader.light4}`,
    },
    '@media (max-width: 640px)': {
      display: 'none',
    }
  },
  givingSeasonMobileLink: {
    color: theme.palette.givingPortal.homepageHeader.light4,
  },
  givingSeasonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    background: `linear-gradient(to right, ${theme.palette.givingPortal.homepageHeader.dark} 10%, ${theme.palette.givingPortal.homepageHeader.main} 28%, ${theme.palette.background.transparent} 50%, ${theme.palette.givingPortal.homepageHeader.main} 72%, ${theme.palette.givingPortal.homepageHeader.dark} 90%)`,
    maxWidth: 1740,
    width: '100%',
    height: EA_FORUM_GIVING_SEASON_HEADER_HEIGHT,
    margin: '0 auto',
    '@media (max-width: 1200px)': {
      background: `linear-gradient(76deg, ${theme.palette.givingPortal.homepageHeader.dark} 10%, ${theme.palette.givingPortal.homepageHeader.main} 40%, ${theme.palette.background.transparent} 70%, ${theme.palette.givingPortal.homepageHeader.main})`,
    },
    [theme.breakpoints.down('sm')]: {
      height: EA_FORUM_HEADER_HEIGHT,
    },
    '@media (max-width: 840px)': {
      display: 'none'
    }
  },
  givingSeasonContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    zIndex: theme.zIndexes.spotlightItem,
    [theme.breakpoints.down('sm')]: {
      display: 'none'
    }
  },
  givingSeasonOverview: {
    maxWidth: 500,
    padding: '0 20px 0 48px'
  },
  givingSeasonHeading: {
    color: theme.palette.givingPortal.homepageHeader.light4,
    fontSize: 40,
    lineHeight: '48px',
    marginTop: 0,
    marginBottom: 8
  },
  givingSeasonDescription: {
    color: theme.palette.givingPortal.homepageHeader.light4,
    paddingLeft: 3
  },
  givingSeasonLink: {
    textDecoration: 'underline'
  },
  givingSeasonTimeline: {
    maxWidth: 600,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, max-content)',
    alignItems: 'center',
    textAlign: 'center',
    fontFamily: theme.palette.fonts.sansSerifStack,
    color: theme.palette.givingPortal.homepageHeader.light4,
    fontSize: 13,
    fontWeight: 500,
    marginRight: -20,
    '@media (max-width: 1400px)': {
      maxWidth: 480,
      gridTemplateColumns: 'repeat(3, auto)',
    },
    '@media (max-width: 1200px)': {
      display: 'none'
    },
  },
  gsTimelineLabel: {
    backgroundColor: theme.palette.givingPortal.homepageHeader.secondaryOpaque,
    padding: '6px 12px',
    borderLeft: `1px solid ${theme.palette.givingPortal.homepageHeader.main}`,
    '&:first-of-type': {
      borderLeft: 'none'
    },
    '&:hover': {
      backgroundColor: theme.palette.givingPortal.homepageHeader.secondaryOpaqueDark,
      opacity: 1
    },
  },
  gsTimelineLabelActive: {
    backgroundColor: theme.palette.givingPortal.homepageHeader.light2,
    color: theme.palette.givingPortal.homepageHeader.main,
    fontSize: 16,
    fontWeight: 600,
    padding: '10px 20px',
    borderRadius: theme.borderRadius.default,
    borderLeft: 'none',
    '&:hover': {
      backgroundColor: theme.palette.givingPortal.homepageHeader.light1,
      opacity: 1
    },
  },
  gsTimelineDates: {
    paddingTop: 8
  },
});

const Header = ({
  standaloneNavigationPresent,
  sidebarHidden,
  toggleStandaloneNavigation,
  stayAtTop=false,
  searchResultsArea,
  classes,
}: {
  standaloneNavigationPresent: boolean,
  sidebarHidden: boolean,
  toggleStandaloneNavigation: ()=>void,
  stayAtTop?: boolean,
  searchResultsArea: React.RefObject<HTMLDivElement>,
  classes: ClassesType,
}) => {
  const [navigationOpen, setNavigationOpenState] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationHasOpened, setNotificationHasOpened] = useState(false);
  const [searchOpen, setSearchOpenState] = useState(false);
  const [unFixed, setUnFixed] = useState(true);
  const currentUser = useCurrentUser();
  const {toc} = useContext(SidebarsContext)!;
  const { captureEvent } = useTracking()
  const { unreadNotifications, unreadPrivateMessages, notificationsOpened } = useUnreadNotifications();
  const { pathname } = useLocation()
  const now = useCurrentTime()
  const isDesktop = useIsAboveBreakpoint('md')

  const setNavigationOpen = (open: boolean) => {
    setNavigationOpenState(open);
    captureEvent("navigationBarToggle", {open: open})
  }

  const handleSetNotificationDrawerOpen = async (isOpen: boolean): Promise<void> => {
    if (!currentUser) return;
    if (isOpen) {
      setNotificationOpen(true);
      setNotificationHasOpened(true);
      await notificationsOpened();
    } else {
      setNotificationOpen(false);
    }
  }

  const handleNotificationToggle = () => {
    if (!currentUser) return;
    const { lastNotificationsCheck } = currentUser

    captureEvent("notificationsIconToggle", {open: !notificationOpen, previousCheck: lastNotificationsCheck})
    void handleSetNotificationDrawerOpen(!notificationOpen);
  }

  // We do two things when the search is open:
  //  1) Pin the header open with the Headroom component
  //  2) Hide the username on mobile so users with long usernames can still
  //     enter search queries
  // Called by SearchBar.
  const setSearchOpen = useCallback((isOpen: boolean) => {
    if (isOpen) { captureEvent("searchToggle", {"open": isOpen}) }
    setSearchOpenState(isOpen);
  }, [captureEvent]);

  const renderNavigationMenuButton = () => {
    // The navigation menu button either toggles a free floating sidebar, opens
    // a drawer with site navigation, or a drawer with table of contents. (This
    // is structured a little oddly because the hideSmDown/hideMdUp filters
    // cause a misalignment if they're in the wrong part of the tree.)
    return <React.Fragment>
      {toc?.sectionData?.sections
        ? <>
            <div className={classes.hideSmDown}>
              <IconButton
                className={classNames(
                  classes.menuButton,
                  {[classes.hideLgUp]: standaloneNavigationPresent && unFixed}
                )}
                color="inherit"
                aria-label="Menu"
                onClick={()=>setNavigationOpen(true)}
              >
                <ForumIcon icon="Menu" />
              </IconButton>
            </div>
            <div className={classes.hideMdUp}>
              <IconButton
                className={classNames(
                  classes.menuButton,
                  {[classes.hideLgUp]: standaloneNavigationPresent && unFixed}
                )}
                color="inherit"
                aria-label="Menu"
                onClick={()=>setNavigationOpen(true)}
              >
                <TocIcon />
              </IconButton>
            </div>
          </>
        : <IconButton
            className={classNames(
              classes.menuButton,
              {[classes.hideLgUp]: standaloneNavigationPresent && unFixed}
            )}
            color="inherit"
            aria-label="Menu"
            onClick={()=>setNavigationOpen(true)}
          >
            <ForumIcon icon="Menu" />
          </IconButton>
      }
      {standaloneNavigationPresent && unFixed && <IconButton
        className={classNames(
          classes.menuButton,
          classes.hideMdDown
        )}
        color="inherit"
        aria-label="Menu"
        onClick={toggleStandaloneNavigation}
      >
        {(isEAForum && !sidebarHidden) ? <ForumIcon icon="CloseMenu" /> : <ForumIcon icon="Menu" />}
      </IconButton>}
    </React.Fragment>
  }

  const hasLogo = isEAForum;

  const {
    SearchBar, UsersMenu, UsersAccountMenu, NotificationsMenuButton, NavigationDrawer,
    NotificationsMenu, KarmaChangeNotifier, HeaderSubtitle, Typography, ForumIcon
  } = Components;
  
  const usersMenuClass = isEAForum ? classes.hideXsDown : classes.hideMdDown
  const usersMenuNode = currentUser && <div className={searchOpen ? usersMenuClass : undefined}>
    <AnalyticsContext pageSectionContext="usersMenu">
      <UsersMenu />
    </AnalyticsContext>
  </div>
  
  // the items on the right-hand side (search, notifications, user menu, login/sign up buttons)
  const rightHeaderItemsNode = <div className={classes.rightHeaderItems}>
    <NoSSR onSSR={<div className={classes.searchSSRStandin} />} >
      <SearchBar onSetIsActive={setSearchOpen} searchResultsArea={searchResultsArea} />
    </NoSSR>
    {!isEAForum && usersMenuNode}
    {!currentUser && <UsersAccountMenu />}
    {currentUser && !currentUser.usernameUnset && <KarmaChangeNotifier
      currentUser={currentUser}
      className={(isEAForum && searchOpen) ? classes.hideXsDown : undefined}
    />}
    {currentUser && !currentUser.usernameUnset && <NotificationsMenuButton
      unreadNotifications={unreadNotifications}
      toggle={handleNotificationToggle}
      open={notificationOpen}
      className={(isEAForum && searchOpen) ? classes.hideXsDown : undefined}
    />}
    {isEAForum && usersMenuNode}
  </div>
  
  // the left side nav menu
  const navigationDrawer = <NavigationDrawer
    open={navigationOpen}
    handleOpen={() => setNavigationOpen(true)}
    handleClose={() => setNavigationOpen(false)}
    toc={toc?.sectionData ?? null}
  />
  
  // the right side notifications menu
  const notificationsMenu = currentUser && <NotificationsMenu
    unreadPrivateMessages={unreadPrivateMessages}
    open={notificationOpen}
    hasOpened={notificationHasOpened}
    setIsOpen={handleSetNotificationDrawerOpen}
  />
  
  // special case for the homepage header of EA Forum Giving Season 2023
  // TODO: delete after 2023
  const isGivingSeason = isEAForum && moment.utc(timelineSpec.start).isBefore(now) && moment.utc(timelineSpec.end).isAfter(now)
  if (isGivingSeason && pathname === '/') {
    return (
      <AnalyticsContext pageSectionContext="header" siteEvent="givingSeason2023">
        <div className={classes.rootGivingSeason}>
          <Headroom
            disableInlineStyles
            downTolerance={10} upTolerance={10}
            height={isDesktop ? EA_FORUM_GIVING_SEASON_HEADER_HEIGHT : EA_FORUM_HEADER_HEIGHT}
            className={classNames(classes.headroom, {
              [classes.headroomPinnedOpen]: searchOpen,
            })}
            onUnfix={() => setUnFixed(true)}
            onUnpin={() => setUnFixed(false)}
            disable={isDesktop}
          >
            <header className={classes.appBarGivingSeason}>
              <div className={classes.givingSeasonGradient}></div>
              <Toolbar disableGutters={isEAForum} className={classes.toolbarGivingSeason}>
                {renderNavigationMenuButton()}
                <Typography className={classes.title} variant="title">
                  <div className={classes.hideSmDown}>
                    <div className={classes.titleSubtitleContainer}>
                      <Link to="/" className={classNames(classes.titleLink, classes.titleLinkGivingSeason)}>
                        {hasLogo && <div className={classNames(classes.siteLogo, classes.siteLogoGivingSeason)}>
                          {lightbulbIcon}
                        </div>}
                        {forumHeaderTitleSetting.get()}
                      </Link>
                    </div>
                  </div>
                  <div className={classes.hideMdUp}>
                    <div className={classes.titleSubtitleContainer}>
                      <Link to="/" className={classNames(classes.titleLink, classes.titleLinkGivingSeason)}>
                        {hasLogo && <div className={classNames(classes.siteLogo, classes.siteLogoGivingSeason)}>
                          {lightbulbIcon}
                        </div>}
                        {forumShortTitleSetting.get()}
                      </Link>
                      <div className={classes.givingSeasonSubtitle}>
                        <Link to="/giving-portal" className={classes.givingSeasonMobileLink}>
                          Giving season 2023
                        </Link>
                      </div>
                    </div>
                  </div>
                </Typography>
                {rightHeaderItemsNode}
              </Toolbar>
              <div className={classes.givingSeasonContent}>
                <div className={classes.givingSeasonOverview}>
                  <Typography variant="display1" className={classes.givingSeasonHeading}>
                    Giving season 2023
                  </Typography>
                  <Typography variant="body2" className={classes.givingSeasonDescription} component='div'>
                    Donate to the Election Fund and discuss where the donations should go. <Link to="/giving-portal" className={classes.givingSeasonLink}>Learn more in the Giving portal.</Link>
                  </Typography>
                </div>
                <div className={classes.givingSeasonTimeline}>
                  {timelineSpec.spans.map(span => {
                    // ignore the voting time period
                    if (span.hatched) return null
                    const isActive = moment.utc(span.start).isBefore(now) && moment.utc(span.end).isAfter(now)
                    return <Link
                      key={`${span.description}-label`}
                      to={span.href}
                      className={classNames(classes.gsTimelineLabel, {[classes.gsTimelineLabelActive]: isActive})}
                    >
                      {span.description}
                    </Link>
                  })}
                  {timelineSpec.spans.map(span => {
                    if (span.hatched) return null
                    return <div key={`${span.description}-dates`} className={classes.gsTimelineDates}>
                      {moment.utc(span.start).format('MMM D')}-{moment.utc(span.end).format('D')}
                    </div>
                  })}
                </div>
              </div>
            </header>
            {navigationDrawer}
          </Headroom>
          {notificationsMenu}
        </div>
      </AnalyticsContext>
    )
  }

  return (
    <AnalyticsContext pageSectionContext="header">
      <div className={classes.root}>
        <Headroom
          disableInlineStyles
          downTolerance={10} upTolerance={10}
          height={64}
          className={classNames(classes.headroom, {
            [classes.headroomPinnedOpen]: searchOpen,
          })}
          onUnfix={() => setUnFixed(true)}
          onUnpin={() => setUnFixed(false)}
          disable={stayAtTop}
        >
          <header className={classes.appBar}>
            <Toolbar disableGutters={isEAForum}>
              {renderNavigationMenuButton()}
              <Typography className={classes.title} variant="title">
                <div className={classes.hideSmDown}>
                  <div className={classes.titleSubtitleContainer}>
                    <Link to="/" className={classes.titleLink}>
                      {hasLogo && <div className={classes.siteLogo}><Components.SiteLogo/></div>}
                      {forumHeaderTitleSetting.get()}
                    </Link>
                    <HeaderSubtitle />
                  </div>
                </div>
                <div className={classes.hideMdUp}>
                  <Link to="/" className={classes.titleLink}>
                    {hasLogo && <div className={classes.siteLogo}><Components.SiteLogo/></div>}
                    {forumShortTitleSetting.get()}
                  </Link>
                </div>
              </Typography>
              {rightHeaderItemsNode}
            </Toolbar>
          </header>
          {navigationDrawer}
        </Headroom>
        {notificationsMenu}
      </div>
    </AnalyticsContext>
  )
}

const HeaderComponent = registerComponent('Header', Header, {
  styles,
  hocs: [withErrorBoundary]
});

declare global {
  interface ComponentTypes {
    Header: typeof HeaderComponent
  }
}
