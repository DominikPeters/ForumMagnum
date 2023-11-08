// TODO: Import component in components.ts
import React from 'react';
import { registerComponent } from '../../../lib/vulcan-lib';
import { commentBodyStyles } from '../../../themes/stylePiping';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';

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
    margin: '16px !important',
    paddingBottom: 8
  },
  checkbox: {
    marginBottom: 0, // Adjust this value to reduce space between checkboxes
  },
});

export const DialogueEditorGuidelines = ({classes}: {
  classes: ClassesType,
}) => {
  return <div className={classes.root}>
    <div>Dialogue Setup</div>
    <p className={classes.info}>
      The LW Team’s current recommended way to dialogue is to use When2Meet to find a 2-3 hour chunk of time where you can both show up and dialogue at the same time.</p> 
    <p className={classes.info}>Please click on the checkbox below once you've filled out your availability! You'll get a notification when other dialogue participants fill out theirs.
    </p>
    <iframe 
  src="https://www.when2meet.com/?22298384-tLmQw" 
  width="150%" 
  height="600px" 
  style={{border: "none", marginLeft: "-25%", marginRight: "-25%"}}
/>
<FormControlLabel
      control={<Checkbox name="availability" />}
      label="I have filled out my availability."
    />
  </div>;
}

const DialogueEditorGuidelinesComponent = registerComponent('DialogueEditorGuidelines', DialogueEditorGuidelines, {styles});

declare global {
  interface ComponentTypes {
    DialogueEditorGuidelines: typeof DialogueEditorGuidelinesComponent
  }
}
