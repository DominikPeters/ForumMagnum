// TODO: Import component in components.ts
import React from 'react';
import { registerComponent } from '../../../lib/vulcan-lib';
import { commentBodyStyles } from '../../../themes/stylePiping';

const styles = (theme: ThemeType): JssStyles => ({
  root: {
    backgroundColor: theme.palette.grey[60],
    paddingLeft: 16,
    paddingTop: 12,
    '& ul': {
      paddingLeft: 20
    }
  },
  info: {
    color: theme.palette.grey[600],
    ...commentBodyStyles(theme),
    margin: '0 !important',
    paddingBottom: 8
  }
});

export const DialogueEditorGuidelines = ({classes}: {
  classes: ClassesType,
}) => {
  return <div className={classes.root}>
    <div>Dialogue Editor</div>
    <ul className={classes.info}>
      <li>You can edit your responses afterwards.</li>
      <li>You can see each other's responses as you type them.</li>
      <li>Default etiquette: It's okay to start drafting your message before the other person finishes theirs.</li>
    </ul>
  </div>;
}

const DialogueEditorGuidelinesComponent = registerComponent('DialogueEditorGuidelines', DialogueEditorGuidelines, {styles});

declare global {
  interface ComponentTypes {
    DialogueEditorGuidelines: typeof DialogueEditorGuidelinesComponent
  }
}
