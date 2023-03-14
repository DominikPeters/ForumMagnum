import React, { useState } from 'react';
import { registerComponent, Components } from '../../lib/vulcan-lib';
import Menu from '@material-ui/core/Menu';
import { QueryLink } from '../../lib/reactRouterWrapper';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import { TAG_POSTS_SORT_ORDER_OPTIONS } from '../../lib/collections/tags/schema';

const styles = (theme: ThemeType): JssStyles => ({
  root: {
    ...theme.typography.body2,
    ...theme.typography.commentStyle,
    color: theme.palette.grey[600],
    marginTop: 8,
    marginBottom: 8,
    marginRight: 8,
    textAlign: "center",
  },
  selectMenu: {
    cursor: "pointer",
    paddingLeft: 4,
    color: theme.palette.primary.main
  },
  noBreak: {
    whiteSpace: "nowrap"
  },
  icon: {
    verticalAlign: "middle",
    position: "relative",
    top: -2,
    left: -2
  },
  menuItem: {
    '&:focus': {
      outline: "none",
    }
  }
})

const defaultOptions = Object.keys(TAG_POSTS_SORT_ORDER_OPTIONS);

const PostsListSortDropdown = ({classes, value, options=defaultOptions, sortingParam="sortedBy"}:{
  classes: ClassesType,
  value: string
  options?: string[],
  sortingParam?: string,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const splitLabel = (label: string) => {
    const words = label.split(" ");
    const lastWord = words.pop();
    return [words.join(" "), lastWord]
  }
  const [labelStart, labelEnd] = splitLabel(TAG_POSTS_SORT_ORDER_OPTIONS[value].label)
  const { MenuItem } = Components;

  return <div className={classes.root}>
    <span className={classes.selectMenu} onClick={e=>setAnchorEl(e.currentTarget)}>
      {labelStart} <span className={classes.noBreak}>{labelEnd} <ArrowDropDownIcon className={classes.icon}/></span>
    </span>
    <Menu
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={()=>setAnchorEl(null)}
    >
      {options.map(sorting => (
        <QueryLink key={sorting} query={{[sortingParam]:sorting}} merge>
          <MenuItem value={sorting} onClick={()=>setAnchorEl(null)}>
            {TAG_POSTS_SORT_ORDER_OPTIONS[sorting].label}
          </MenuItem>
        </QueryLink>
      ))}
    </Menu>
  </div>
}

const PostsListSortDropdownComponent = registerComponent('PostsListSortDropdown', PostsListSortDropdown, {styles});

declare global {
  interface ComponentTypes {
    PostsListSortDropdown: typeof PostsListSortDropdownComponent
  }
}
