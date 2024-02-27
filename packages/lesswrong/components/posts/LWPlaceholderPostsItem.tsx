import classNames from 'classnames';
import React from 'react';
import { Components, registerComponent } from "../../lib/vulcan-lib";
import { styles } from './LWPostsItem';

const LWPlaceholderPostsItem = ({showBottomBorder, classes}: {
  showBottomBorder?: boolean,
  classes: ClassesType,
}) => {
  return <div className={classes.row}>
    <div className={classNames(
      classes.root,
      classes.background,
      { [classes.bottomBorder]: showBottomBorder }
    )}>
      <div className={classes.postsItem}>
        <span className={classes.title}/>
      </div>
    </div>
  </div>
}

const LWPlaceholderPostsItemComponent = registerComponent('LWPlaceholderPostsItem', LWPlaceholderPostsItem, {styles});

declare global {
  interface ComponentTypes {
    LWPlaceholderPostsItem: typeof LWPlaceholderPostsItemComponent
  }
}

