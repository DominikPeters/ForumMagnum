import React, { useState, useCallback, useEffect } from 'react';
import { Components, registerComponent } from '../../lib/vulcan-lib';
import { useMulti } from '../../lib/crud/withMulti';
import moment from '../../lib/moment-timezone';
import { timeframeToTimeBlock, TimeframeType } from './timeframeUtils'
import { useTimezone } from '../common/withTimezone';
import { QueryLink } from '../../lib/reactRouterWrapper';
import type { ContentTypeString } from './PostsPage/ContentType';
import filter from 'lodash/filter';
import { useLocation } from '../../lib/routeUtil';

const styles = (theme: ThemeType): JssStyles => ({
  root: {
    marginBottom: theme.spacing.unit*4
  },
  timeBlockTitle: {
    whiteSpace: "pre",
    textOverflow: "ellipsis",
    ...theme.typography.postStyle,
    position: "sticky",
    paddingTop: 4,
    paddingBottom: 4,
    zIndex: 1
  },
  smallScreenTitle: {
    [theme.breakpoints.down('xs')]: {
      display: "none",
    },
  },
  largeScreenTitle: {
    [theme.breakpoints.up('sm')]: {
      display: "none",
    },
  },
  loadMore: {
    marginTop: 6,
  },
  noPosts: {
    marginLeft: "23px",
    color: theme.palette.text.dim,
  },
  posts: {
    boxShadow: theme.palette.boxShadow.default,
  },
  frontpageSubtitle: {
    marginBottom: 6
  },
  otherSubtitle: {
    marginTop: 6,
    marginBottom: 6
  },
  divider: {/* Exists only to get overriden by the eaTheme */}
})

interface PostTypeOptions {
  name: ContentTypeString
  postIsType: (post: PostsBase)=>boolean
  label: string
}

const postTypes: PostTypeOptions[] = [
  {name: 'frontpage', postIsType: (post: PostsBase) => !!post.frontpageDate, label: 'Frontpage Posts'},
  {name: 'personal', postIsType: (post: PostsBase) => !post.frontpageDate, label: 'Personal Blogposts'}
]

const PostsTimeBlock = ({ terms, timeBlockLoadComplete, startDate, hideIfEmpty, timeframe, displayShortform=true, classes, includeTags=true}: {
  terms: PostsViewTerms,
  timeBlockLoadComplete: ()=>void,
  startDate: moment.Moment,
  hideIfEmpty: boolean,
  timeframe: TimeframeType,
  displayShortform?: boolean,
  classes: ClassesType,
  includeTags?: boolean,
}) => {
  const [noShortform, setNoShortform] = useState(false);
  const [noTags, setNoTags] = useState(false);
  const { timezone } = useTimezone();

  const [tagFilter, setTagFilter] = useState<string|null>(null)
  const {query} = useLocation()
  const displayPostsTagsList = query.limit

  const { results: posts, totalCount, loading, loadMoreProps } = useMulti({
    terms,
    collectionName: "Posts",
    fragmentName: 'PostsList',
    enableTotal: true,
    itemsPerPage: 50,
  });

  const filteredPosts = tagFilter ? filter(posts, post => post.tags.map(tag=>tag._id).includes(tagFilter)) : posts

  const handleTagFilter = (tagId: string) => {
    if (tagFilter === tagId) { 
      setTagFilter(null)
    } else {
      setTagFilter(tagId)
    }
  }

  useEffect(() => {
    if (!loading && timeBlockLoadComplete) {
      timeBlockLoadComplete();
    }
  // No dependency list because we want this to be called even when it looks
  // like nothing has changed, to signal loading is complete
  });

  // Child component needs a way to tell us about the presence of shortforms
  const reportEmptyShortform = useCallback(() => {
    setNoShortform(true);
  }, []);
  const reportEmptyTags = useCallback(() => {
    setNoTags(true);
  }, []);

  const getTitle = (startDate: moment.Moment, timeframe: TimeframeType, size: 'xsDown' | 'smUp' | null) => {
    if (timeframe === 'yearly') return startDate.format('YYYY')
    if (timeframe === 'monthly') return startDate.format('MMMM YYYY')
    let result = size === 'smUp' ? startDate.format('ddd, MMM Do YYYY') : startDate.format('dddd, MMMM Do YYYY')
    if (timeframe === 'weekly') result = `Week Of ${result}`
    return result
  }

  const render = () => {
    const { PostsItem2, LoadMore, ShortformTimeBlock, TagEditsTimeBlock, ContentType, Divider, Typography, PostsTagsList } = Components
    const timeBlock = timeframeToTimeBlock[timeframe]

    const noPosts = !loading && (!filteredPosts || (filteredPosts.length === 0))
    // The most recent timeBlock is hidden if there are no posts or shortforms
    // on it, to avoid having an awkward empty partial timeBlock when it's close
    // to midnight.
    if (noPosts && noShortform && noTags && hideIfEmpty) {
      return null
    }

    const postGroups = postTypes.map(type => ({
      ...type,
      filteredPosts: filteredPosts?.filter(type.postIsType) || []
    }))

    return (
      <div className={classes.root}>
        <QueryLink merge rel="nofollow" query={{
          after: moment.tz(startDate, timezone).startOf(timeBlock).format("YYYY-MM-DD"), 
          before: moment.tz(startDate, timezone).endOf(timeBlock).add(1, 'd').format("YYYY-MM-DD"),
          limit: 100
        }}>
          <Typography variant="headline" className={classes.timeBlockTitle}>
            {['yearly', 'monthly'].includes(timeframe) && <div>
              {getTitle(startDate, timeframe, null)}
            </div>}
            {['weekly', 'daily'].includes(timeframe) && <div>
              <div className={classes.smallScreenTitle}>
                {getTitle(startDate, timeframe, 'xsDown')}
              </div>
              <div className={classes.largeScreenTitle}>
                {getTitle(startDate, timeframe, 'smUp')}
              </div>
            </div>}
          </Typography>
        </QueryLink>

        <div className={classes.dayContent}>
          { noPosts && <div className={classes.noPosts}>
            No posts for {
            timeframe === 'daily' ?
              startDate.format('MMMM Do YYYY') :
              // Should be pretty rare. Basically people running off the end of
              // the Forum history on yearly
              `this ${timeBlock}`
            }
          </div> }
          {displayPostsTagsList && <PostsTagsList posts={posts ?? null} currentFilter={tagFilter} handleFilter={handleTagFilter} expandedMinCount={0}/>}
          {postGroups.map(({name, filteredPosts, label}) => {
            if (filteredPosts?.length > 0) return <div key={name}>
              <div
                className={name === 'frontpage' ? classes.frontpageSubtitle : classes.otherSubtitle}
              >
                <ContentType type={name} label={label} />
              </div>
              <div className={classes.posts}>
                {filteredPosts.map((post, i) =>
                  <PostsItem2 key={post._id} post={post} index={i} dense showBottomBorder={i < filteredPosts!.length -1}/>
                )}
              </div>
            </div>
          })}

          {(filteredPosts && filteredPosts.length < totalCount!) && <div className={classes.loadMore}>
            <LoadMore
              {...loadMoreProps}
            />
          </div>}
          
          {displayShortform && <ShortformTimeBlock
            reportEmpty={reportEmptyShortform}
            terms={{
              view: "topShortform",
              // NB: The comments before differs from posts in that before is not
              // inclusive
              before: moment.tz(startDate, timezone).endOf(timeBlock).toString(),
              after: moment.tz(startDate, timezone).startOf(timeBlock).toString()
            }}
          />}
          
          {timeframe==="daily" && includeTags && <TagEditsTimeBlock
            before={moment.tz(startDate, timezone).endOf(timeBlock).toString()}
            after={moment.tz(startDate, timezone).startOf(timeBlock).toString()}
            reportEmpty={reportEmptyTags}
          />}
        </div>
        {!loading && <div className={classes.divider}>
          <Divider wings={false} />
        </div>}
      </div>
    );
  }
  return render();
};

const PostsTimeBlockComponent = registerComponent('PostsTimeBlock', PostsTimeBlock, {
  styles,
});

declare global {
  interface ComponentTypes {
    PostsTimeBlock: typeof PostsTimeBlockComponent
  }
}
