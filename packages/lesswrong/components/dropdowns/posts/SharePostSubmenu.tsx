import React from 'react';
import { Components, registerComponent } from '../../../lib/vulcan-lib';
import { useHover } from '../../common/withHover';
import { postGetPageUrl } from '../../../lib/collections/posts/helpers';
import { isServer } from '../../../lib/executionEnvironment';
import ShareIcon from "@material-ui/icons/Share";
import Paper from '@material-ui/core/Paper';

const styles = (theme: ThemeType): JssStyles => ({
})

const SharePostSubmenu = ({post, classes}: {
  post: PostsListBase,
  classes: ClassesType,
}) => {
  const { SharePostActions, DropdownItem, LWTooltip } = Components;
  const { hover, eventHandlers } = useHover();
  
  function shareClicked() {
    // navigator.canShare will be present on mobile devices with sharing-intents,
    // absent on desktop.
    if (!!navigator.canShare) {
      const sharingOptions = {
        title: post.title,
        text: post.title,
        url: postGetPageUrl(post),
      };
      if (navigator.canShare(sharingOptions)) {
        navigator.share(sharingOptions);
      }
    } else {
      // If navigator.canShare is missing, do nothing
    }
  }
  
  const submenu = <Paper>
    <SharePostActions post={post}/>
  </Paper>
  
  const hasSubmenu = isServer || !navigator.canShare;
  const MaybeWrapWithSubmenu = hasSubmenu
    ? ({children}: {children: React.ReactNode}) => <LWTooltip
        title={submenu}
        tooltip={false} clickable inlineBlock={false}
        placement="left-start"
      >
        {children}
      </LWTooltip>
    : ({children}: {children: React.ReactNode}) => <>
        {children}
      </>
  
  return <div {...eventHandlers}>
    <MaybeWrapWithSubmenu>
      <DropdownItem
        onClick={shareClicked}
        icon={() => <ShareIcon/>}
        title="Share"
      />
    </MaybeWrapWithSubmenu>
  </div>
}
const SharePostSubmenuComponent = registerComponent('SharePostSubmenu', SharePostSubmenu, {styles});
declare global {
  interface ComponentTypes {
    SharePostSubmenu: typeof SharePostSubmenuComponent
  }
}
