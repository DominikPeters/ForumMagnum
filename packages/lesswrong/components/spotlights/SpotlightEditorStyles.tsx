import React from 'react';
import { registerComponent } from '../../lib/vulcan-lib';
import { descriptionStyles } from './SpotlightItem';

const styles = (theme: ThemeType): JssStyles => ({
  root: {
    [theme.breakpoints.up('md')]: {
      '& .form-section-default > div': {
        display: "flex",
        flexWrap: "wrap",
      },
      '& .input-description': {
        width: "100%",
        ...descriptionStyles(theme),
      },
      '& .input-spotlightImageId': {
        width: "66%"
      },
      '& .input-documentId, & .input-documentType, & .input-position, & .input-draft, & .input-duration, & .input-customTitle, & .input-customSubtitle': {
        width: "calc(33% - 12px)",
        overflow: "hidden",
        marginRight: 12
      },
      '& .form-submit': {
        display: "flex",
        justifyContent: "flex-end"
      }
    }
  }
});

export const SpotlightEditorStyles = ({classes, children}: {
  classes: ClassesType,
  children: any
}) => {
  return <div className={classes.root}>
    {children}
  </div>;
}

const TemplateComponentComponent = registerComponent('SpotlightEditorStyles', SpotlightEditorStyles, {styles});

declare global {
  interface ComponentTypes {
    SpotlightEditorStyles: typeof TemplateComponentComponent
  }
}

