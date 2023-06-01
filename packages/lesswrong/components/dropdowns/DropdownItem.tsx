import React, { FC, ReactElement, MouseEvent } from "react";
import { registerComponent, Components } from "../../lib/vulcan-lib";
import { ForumIconName } from "../common/ForumIcon";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import { Link } from "../../lib/reactRouterWrapper";
import type { HashLinkProps } from "../common/HashLink";
import { isEAForum } from "../../lib/instanceSettings";
import classNames from "classnames";

const styles = (theme: ThemeType): JssStyles => ({
  root: {
    ...(isEAForum && {
      "&:hover": {
        opacity: 1,
      },
    }),
  },
  main: {
    ...(isEAForum && {
      borderRadius: theme.borderRadius.default,
      padding: 8,
      "&:hover": {
        background: theme.palette.dropdown.hoverBackground,
        "& svg": {
          color: theme.palette.grey[1000],
        },
      },
      "& .ForumIcon-root": {
        fontSize: isEAForum ? 20 : undefined,
      },
    }),
  },
  noIcon: {
    paddingLeft: isEAForum ? 12 : undefined,
  },
  title: {
    flexGrow: 1,
  },
  afterIcon: {
    fontSize: 20,
    marginLeft: 4,
  },
  sideMessage: {
    position: "absolute",
    right: 12,
    top: 12,
    color: theme.palette.text.dim40,
    [theme.breakpoints.down("xs")]: {
      display: "none",
    },
  },
  tooltip: {
    display: "block",
  },
});

export type DropdownItemAction = {
  onClick: (event: MouseEvent) => void | Promise<void>,
  to?: never,
} | {
  onClick?: never,
  to: HashLinkProps["to"],
}

export type DropdownItemProps = DropdownItemAction & {
  title: string | JSX.Element,
  sideMessage?: string,
  icon?: ForumIconName | (() => ReactElement),
  iconClassName?: string,
  afterIcon?: ForumIconName,
  afterIconClassName?: string,
  tooltip?: string,
  disabled?: boolean,
  loading?: boolean,
  rawLink?: boolean,
  value?: string,
  className?: string,
}

const DummyWrapper: FC<{className?: string}> = ({className, children}) =>
  <div className={className}>{children}</div>;

const RawLink: FC<{
  to: string,
  className?: string,
}> = ({to, className, children}) => (
  <a href={to} className={className}>
    {children}
  </a>
);

const DropdownItem = ({
  title,
  sideMessage,
  onClick,
  to,
  icon,
  iconClassName,
  afterIcon,
  afterIconClassName,
  tooltip,
  disabled,
  loading,
  rawLink,
  value,
  className,
  classes,
}: DropdownItemProps & {classes: ClassesType}) => {
  const {MenuItem, Loading, ForumIcon, LWTooltip} = Components;
  const LinkWrapper = to ? rawLink ? RawLink : Link : DummyWrapper;
  const TooltipWrapper = tooltip ? LWTooltip : DummyWrapper;
  return (
    <LinkWrapper to={to!} className={classes.root}>
      <TooltipWrapper title={tooltip!} className={classes.tooltip}>
        <MenuItem
          value={value}
          onClick={onClick}
          disabled={disabled}
          className={classNames(classes.main, className, {[classes.noIcon]: !icon})}
        >
          {loading &&
            <ListItemIcon>
              <Loading />
            </ListItemIcon>
          }
          {icon && !loading &&
            <ListItemIcon>
              {typeof icon === "string"
                ? <ForumIcon icon={icon} className={iconClassName} />
                : icon()
              }
            </ListItemIcon>
          }
          <span className={classes.title}>{title}</span>
          {afterIcon &&
            <ForumIcon icon={afterIcon} className={classNames(classes.afterIcon, afterIconClassName)} />
          }
          {sideMessage &&
            <div className={classes.sideMessage}>
              {sideMessage}
            </div>
          }
        </MenuItem>
      </TooltipWrapper>
    </LinkWrapper>
  );
}

const DropdownItemComponent = registerComponent(
  "DropdownItem",
  DropdownItem,
  {styles},
);

declare global {
  interface ComponentTypes {
    DropdownItem: typeof DropdownItemComponent
  }
}
