import React from 'react';
import { registerComponent, Components } from '../../lib/vulcan-lib';
import { useLocation } from '../../lib/routeUtil';
import { getReviewYearFromString, reviewYears } from '../../lib/reviewUtils';
import { Link } from '../../lib/reactRouterWrapper';
import classNames from 'classnames';

const styles = (theme: ThemeType): JssStyles => ({
  yearLink: {
    ...theme.typography.body2,
    fontSize: theme.typography.body1.fontSize,
    marginBottom: 14,
    color: theme.palette.grey[500],
    marginRight: 14,
    '&:hover': {
      opacity: .5
    }
  },
  selected: {
    color: theme.palette.grey[900]
  }
});


export const ReviewsPage = ({classes}:{classes: ClassesType}) => {
  const { SingleColumnSection, ReviewsList } = Components

  const { params } = useLocation()

  let reviewYear
  if (params.year !== 'all') {
    reviewYear = getReviewYearFromString(params.year)
  }

  return <SingleColumnSection>
    <div>
      <Link className={classes.yearLink} to="/reviews/all">All</Link>
      {reviewYears.map(year => <Link className={classNames(classes.yearLink, {[classes.selected]: year+"" === params.year})} to={`/reviews/${year}`} key={year}>
        {year}
      </Link>)}
    </div>
    <ReviewsList reviewYear={reviewYear} title={`Reviews ${reviewYear ?? "(All Years)"}`} defaultSort="top"/>
  </SingleColumnSection>;
}

const ReviewsPageComponent = registerComponent('ReviewsPage', ReviewsPage, {styles});

declare global {
  interface ComponentTypes {
    ReviewsPage: typeof ReviewsPageComponent
  }
}

