import React, { useCallback, useState } from 'react';
import { Components, makeAbsolute, registerComponent } from '../../lib/vulcan-lib';
import Button from '@material-ui/core/Button'
import CloseIcon from '@material-ui/icons/Close'
import { AnalyticsContext, useTracking } from '../../lib/analyticsEvents';
import Tooltip from '@material-ui/core/Tooltip';
import classNames from 'classnames';
import OpenInNew from '@material-ui/icons/OpenInNew';
import moment from 'moment';
import { InteractionWrapper, useClickableCell } from '../common/useClickableCell';
import { useCurrentUser } from '../common/withUser';
import { Link } from '../../lib/reactRouterWrapper';

const styles = (theme: ThemeType): JssStyles => ({
  root: {
    maxHeight: 1200, // This is to make the close transition work
    background: theme.palette.grey[0],
    fontFamily: theme.typography.fontFamily,
    padding: '10px 12px 12px',
    border: `1px solid ${theme.palette.grey[100]}`,
    borderRadius: theme.borderRadius.default,
    cursor: 'pointer',
    "&:hover": {
      background: theme.palette.grey[50],
      border: `1px solid ${theme.palette.grey[250]}`,
      '& .TargetedJobAd-collapsedBody::after': {
        background: `linear-gradient(to top, ${theme.palette.grey[50]}, transparent)`,
      },
    },
    [theme.breakpoints.down('xs')]: {
      columnGap: 12,
      padding: '6px 10px',
    }
  },
  rootClosed: {
    opacity: 0,
    visibility: 'hidden',
    paddingTop: 0,
    paddingBottom: 0,
    maxHeight: 0,
    transitionProperty: 'opacity, visibility, padding-top, padding-bottom, max-height',
    transitionDuration: '0.5s',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 10,
    marginBottom: 8,
  },
  jobRecLabel: {
    flexGrow: 1
  },
  infoIcon: {
    fontSize: 14,
    color: theme.palette.grey[400],
    transform: 'translateY(2px)'
  },
  closeButton: {
    padding: '.25em',
    minHeight: '.75em',
    minWidth: '.75em',
  },
  closeIcon: {
    fontSize: 14,
    color: theme.palette.grey[500],
  },
  mainRow: {
    display: 'flex',
    alignItems: 'flex-start',
    columnGap: 8,
  },
  logo: {
    flex: 'none',
    width: 36,
    borderRadius: theme.borderRadius.small,
    marginTop: 5,
  },
  bodyCol: {
    flexGrow: 1,
    marginBottom: 6,
    [theme.breakpoints.down('xs')]: {
      marginBottom: 4
    }
  },
  headerRow: {
    marginBottom: 4
  },
  pinIcon: {
    verticalAlign: 'sub',
    width: 16,
    height: 16,
    color: theme.palette.primary.main,
    padding: 1.5,
    marginRight: 8,
  },
  header: {
    display: 'inline',
    fontSize: 16,
    lineHeight: '22px',
    fontWeight: 600,
    color: theme.palette.grey[1000],
    margin: '0 0 4px'
  },
  inline: {
    display: 'inline'
  },
  link: {
    color: theme.palette.primary.main
  },
  metadataRow: {
    display: 'flex',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: '3px'
  },
  metadata: {
    display: 'flex',
    alignItems: 'center',
    columnGap: 4,
    fontSize: 13,
    lineHeight: '17px',
    color: theme.palette.grey[600],
    fontWeight: 500,
  },
  metadataIcon: {
    fontSize: 12,
  },
  feedbackLink: {
    [theme.breakpoints.down('xs')]: {
      display: 'none'
    }
  },
  collapsedBody: {
    position: 'relative',
    height: 50,
    overflow: 'hidden',
    '&::after': {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      height: 20,
      content: "''",
      background: `linear-gradient(to top, ${theme.palette.grey[0]}, transparent)`,
    }
  },
  description: {
    maxWidth: 666,
    fontSize: 13,
    lineHeight: '20px',
    fontWeight: 500,
    color: theme.palette.grey[1000],
    margin: '10px 0',
    '& ul': {
      margin: 0
    },
    '& li': {
      marginTop: 1
    }
  },
  btnRow: {
    display: 'flex',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: '12px',
    alignItems: 'baseline',
    marginTop: 18,
    marginBottom: 8
  },
  btn: {
    textTransform: 'none',
    boxShadow: 'none',
  },
  btnIcon: {
    fontSize: 13,
    marginLeft: 6
  },
})

// list of options from EAG
type EAGOccupation =
  'Academic research'|
  'Operations'|
  'Entrepreneurship'|
  'Policymaking/Civil service'|
  'EA community building/community management'|
  'AI safety technical research'|
  'Software development/Software engineering'|
  'People management'|
  'Education'|
  'Global health & development'|
  'Improving institutional decision making'|
  'Earning to give'|
  'AI strategy & policy'|
  'Project management/ Program management'|
  'Healthcare/Medicine'|
  'Technology'|
  'Grantmaking'|
  'Information security'|
  'Climate change mitigation'|
  'Global coordination & peace-building'|
  'Consulting'|
  'Alternative proteins'|
  'Global mental health & well-being'|
  'Nuclear security'|
  'Politics'|
  'Writing'|
  'Event production'|
  'Product management'|
  'Wild animal welfare'|
  'Biosecurity'|
  'Philanthropy'|
  'Farmed animal welfare'|
  'Communications/Marketing'|
  'HR/People operations'|
  'Global priorities research'|
  'Journalism'|
  'Finance/Accounting'|
  'User experience design/research'|
  'Data science/Data visualization'|
  'Counselling/Social work'|
  'Graphic design'|
  'S-risk'

type JobAdData = {
  eagOccupations?: EAGOccupation[],  // used to match on EAG experience + interests
  interestedIn?: EAGOccupation[],    // used to match on EAG interests
  subscribedTagIds?: string[],       // used to match on a set of topics that the user is subscribed to
  readCoreTagIds?: string[],         // used to match on a set of core topics that the user has read frequently
  logo: string,                      // url for org logo
  occupation: string,                // text displayed in the tooltip
  feedbackLinkPrefill: string,       // url param used to prefill part of the feedback form
  bitlyLink: string,                 // bitly link to the job ad page
  role: string,
  insertThe?: boolean,               // set if you want to insert a "the" before the org name
  org: string,
  orgLink: string,                   // internal link on the org name
  salary?: string,
  location: string,
  countryCode?: string,              // if provided, only show to users who we think are in this country
  roleType?: string,                 // i.e. part-time, contract
  deadline?: moment.Moment,          // also used to hide the ad after this date
  getDescription: (classes: ClassesType) => JSX.Element
}

// job-specific data for the ad
// (also used in the reminder email, so links in the description need to be absolute)
export const JOB_AD_DATA: Record<string, JobAdData> = {
  'cltr-biosecurity-policy-advisor': {
    subscribedTagIds: [
      'H43gvLzBCacxxamPe', // biosecurity
      'of9xBvR3wpbp6qsZC', //policy
    ],
    readCoreTagIds: [
      'H43gvLzBCacxxamPe', // biosecurity
      'of9xBvR3wpbp6qsZC', //policy
    ],
    logo: 'https://res.cloudinary.com/cea/image/upload/q_auto,f_auto/v1707183771/Screen_Shot_2024-02-05_at_8.42.20_PM',
    occupation: 'biosecurity and policy',
    feedbackLinkPrefill: 'Biosecurity+Policy+Advisor+at+CLTR',
    bitlyLink: "https://efctv.org/4buFxw8", // https://www.longtermresilience.org/post/we-are-hiring-for-a-biosecurity-policy-adviser-deadline-8-march-2024
    role: 'Biosecurity Policy Advisor',
    insertThe: true,
    org: 'Centre for Long-Term Resilience',
    orgLink: '/topics/centre-for-long-term-resilience',
    salary: '£63k - £80k',
    location: 'UK (London-based)',
    countryCode: 'GB',
    deadline: moment('2024-03-08'),
    getDescription: (classes: ClassesType) => <>
      <div className={classes.description}>
        The <InteractionWrapper className={classes.inline}>
          <Link to="https://www.longtermresilience.org/" target="_blank" rel="noopener noreferrer" className={classes.link}>
            Centre for Long-Term Resilience (CLTR)
          </Link>
        </InteractionWrapper> is a UK-based non-profit and independent think tank with a mission to transform global resilience to extreme risks.
        This role will contribute to developing, evaluating, and advocating for impactful <span className={classes.link}>
          <Components.HoverPreviewLink href={makeAbsolute("/topics/biosecurity")}>
            biosecurity
          </Components.HoverPreviewLink>
        </span> policies aimed at reducing extreme biological risks.
      </div>
      <div className={classes.description}>
        Ideal candidates have:
        <ul>
          <li>Experience in research, policy, or advocacy in biosecurity or a related field</li>
          <li>A good understanding of the biosecurity landscape</li>
          <li>A track record of executing tasks independently and effectively</li>
        </ul>
      </div>
    </>
  },
  'leep-program-manager': {
    subscribedTagIds: [
      'sWcuTyTB5dP3nas2t', // global health & development
      'of9xBvR3wpbp6qsZC', //policy
    ],
    logo: 'https://80000hours.org/wp-content/uploads/2022/06/LEEP-logo-160x160.png',
    occupation: 'global health and policy',
    feedbackLinkPrefill: 'Program+Manager+at+LEEP',
    bitlyLink: "https://efctv.org/49HrguD", // https://leadelimination.org/jobs/
    role: 'Program Manager',
    insertThe: true,
    org: 'Lead Exposure Elimination Project',
    orgLink: '/topics/lead-exposure-elimination-project',
    location: 'Remote, multiple locations',
    getDescription: (classes: ClassesType) => <>
      <div className={classes.description}>
        <InteractionWrapper className={classes.inline}>
          <Link to="https://www.leadelimination.org/" target="_blank" rel="noopener noreferrer" className={classes.link}>
            LEEP
          </Link>
        </InteractionWrapper> is an impact-driven non-profit that aims to eliminate childhood <span className={classes.link}>
          <Components.HoverPreviewLink href={makeAbsolute("/topics/lead-poisoning")}>
            lead poisoning
          </Components.HoverPreviewLink>
        </span>, which affects an estimated one in three children worldwide.
        LEEP is hiring program managers to lead their programs in multiple time zones and locations.
      </div>
      <div className={classes.description}>
        Ideal candidates have:
        <ul>
          <li>Strong interpersonal and stakeholder management skills</li>
          <li>Willingness to travel for 8 to 12 weeks per year</li>
          <li>Strong ability to prioritise and focus on impact</li>
        </ul>
      </div>
    </>
  },
  'thl-apa-program-specialist': {
    subscribedTagIds: [
      'QdH9f8TC6G8oGYdgt', // animal welfare
      'of9xBvR3wpbp6qsZC', // policy
    ],
    logo: 'https://80000hours.org/wp-content/uploads/2019/12/he-humane-league-160x160.png',
    occupation: 'animal welfare and policy',
    feedbackLinkPrefill: 'APA+Program+Specialist+at+THL',
    bitlyLink: "https://efctv.org/3UrH6ov", // https://thehumaneleague.org/single-offer-career?gh_jid=5608962
    role: 'Animal Policy Alliance, Program Specialist',
    org: 'The Humane League',
    orgLink: '/topics/the-humane-league',
    salary: '$65k - $80k',
    location: 'Remote (USA)',
    deadline: moment('2024-02-08'),
    getDescription: (classes: ClassesType) => <>
      <div className={classes.description}>
        Animal Policy Alliance (APA), launched by <InteractionWrapper className={classes.inline}>
          <Link to="https://thehumaneleague.org/" target="_blank" rel="noopener noreferrer" className={classes.link}>
            The Humane League
          </Link>
        </InteractionWrapper> in 2022, is a national network of state and local animal protection and food policy advocacy groups in the US that include animals
        raised for food among their legislative priorities. The program specialist will play a key role in supporting the growth and operation of the APA.
      </div>
      <div className={classes.description}>
        Ideal candidates have:
        <ul>
          <li>A minimum 5 years experience in positions related to public policy and/or animal protection advocacy</li>
          <li>Event planning experience</li>
          <li>Outstanding relationship building and interpersonal skills</li>
        </ul>
      </div>
    </>
  },
}

/**
 * This component only handles the job ad UI. See TargetedJobAdSection.tsx for functional logic.
 */
const TargetedJobAd = ({ad, onDismiss, onExpand, onApply, onRemindMe, classes}: {
  ad: string,
  onDismiss: () => void,
  onExpand: () => void,
  onApply: () => void,
  onRemindMe: () => void,
  classes: ClassesType,
}) => {
  const adData = JOB_AD_DATA[ad]
  
  const currentUser = useCurrentUser()
  const { captureEvent } = useTracking()
  // expand/collapse the ad contents
  const [expanded, setExpanded] = useState(false)
  // clicking either "apply" or "remind me" will close the ad
  const [closed, setClosed] = useState(false)

  const handleToggleExpand = useCallback(() => {
    if (expanded) {
      setExpanded(false)
    } else {
      captureEvent('expandJobAd')
      setExpanded(true)
      onExpand()
    }
  }, [expanded, setExpanded, captureEvent, onExpand])
  const { onClick } = useClickableCell({onClick: handleToggleExpand})
  
  const handleApply = useCallback(() => {
    setClosed(true)
    onApply()
  }, [setClosed, onApply])
  
  const handleRemindMe = useCallback(() => {
    setClosed(true)
    onRemindMe()
  }, [setClosed, onRemindMe])
  
  const { HoverPreviewLink, LWTooltip, ForumIcon, EAButton } = Components
  
  if (!adData || !currentUser) {
    return null
  }

  return <AnalyticsContext pageSubSectionContext="targetedJobAd">
    <div className={classNames(classes.root, {[classes.rootClosed]: closed})} onClick={onClick}>
      <div className={classes.topRow}>
        <div className={classNames(classes.jobRecLabel, classes.metadata)}>
          Job recommendation for {currentUser.displayName}
          <LWTooltip title={
            `You're seeing this recommendation because of your interest in ${adData.occupation}.`
          }>
            <ForumIcon icon="InfoCircle" className={classes.infoIcon} />
          </LWTooltip>
        </div>
        <div className={classNames(classes.feedbackLink, classes.metadata)}>
          <InteractionWrapper>
            <a href={`
                https://docs.google.com/forms/d/e/1FAIpQLSd4uDGbXbJSwYX2w_9wXNTuLLBf7bhiWoWc-goJJXiWGA7qDg/viewform?usp=pp_url&entry.70861771=${adData.feedbackLinkPrefill}
              `}
              target="_blank"
              rel="noopener noreferrer"
            >
              Give us feedback
            </a>
          </InteractionWrapper>
        </div>
        <InteractionWrapper>
          <Tooltip title="Dismiss">
            <Button className={classes.closeButton} onClick={onDismiss}>
              <CloseIcon className={classes.closeIcon} />
            </Button>
          </Tooltip>
        </InteractionWrapper>
      </div>
      <div className={classes.mainRow}>
        <img src={adData.logo} className={classes.logo} />
        <div className={classes.bodyCol}>
          <div className={classes.headerRow}>
            <ForumIcon icon="Pin" className={classes.pinIcon} />
            <h2 className={classes.header}>
              <InteractionWrapper className={classes.inline}>
                <Link to={adData.bitlyLink} target="_blank" rel="noopener noreferrer">
                  {adData.role}
                </Link>
              </InteractionWrapper> at{adData.insertThe ? ' the ' : ' '}
              <InteractionWrapper className={classes.inline}>
                <HoverPreviewLink href={adData.orgLink}>
                  {adData.org}
                </HoverPreviewLink>
              </InteractionWrapper>
            </h2>
          </div>
          <div className={classes.metadataRow}>
            {adData.salary && <>
              <div className={classes.metadata}>
                {adData.salary}
              </div>
              <div>·</div>
            </>}
            <div className={classes.metadata}>
              {adData.location}
            </div>
            {adData.roleType && <>
              <div>·</div>
              <div className={classes.metadata}>
                {adData.roleType}
              </div>
            </>}
            {adData.deadline && <>
              <div>·</div>
              <div className={classes.metadata}>
                Deadline: {adData.deadline.format('MMM Do')}
              </div>
            </>}
          </div>
          
          <div className={classNames({[classes.collapsedBody]: !expanded})}>
            {adData.getDescription(classes)}
            <InteractionWrapper>
              <div className={classes.btnRow}>
                <EAButton
                  variant="contained"
                  href={adData.bitlyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classes.btn}
                  onClick={() => handleApply()}
                >
                  Apply <OpenInNew className={classes.btnIcon} />
                </EAButton>
                {adData.deadline && <EAButton variant="contained" style="grey" onClick={handleRemindMe} className={classes.btn}>
                  Remind me before the deadline
                </EAButton>}
              </div>
            </InteractionWrapper>
          </div>
        </div>
      </div>
    </div>
  </AnalyticsContext>
}

const TargetedJobAdComponent = registerComponent("TargetedJobAd", TargetedJobAd, {styles});

declare global {
  interface ComponentTypes {
    TargetedJobAd: typeof TargetedJobAdComponent
  }
}
