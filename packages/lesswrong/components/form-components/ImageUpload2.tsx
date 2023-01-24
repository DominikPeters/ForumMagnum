/* global cloudinary */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {Components, registerComponent } from '../../lib/vulcan-lib';
import { Helmet } from 'react-helmet';
import Button from '@material-ui/core/Button';
import ImageIcon from '@material-ui/icons/Image';
import classNames from 'classnames';
import { cloudinaryCloudNameSetting } from '../../lib/publicSettings';
import { useTheme } from '../themes/useTheme';
import { useDialog } from '../common/withDialog';
import { useCurrentUser } from '../common/withUser';
import { userHasDefaultProfilePhotos } from '../../lib/betas';
import { cloudinaryUploadPresetBannerSetting, cloudinaryUploadPresetEventImageSetting, cloudinaryUploadPresetGridImageSetting, cloudinaryUploadPresetProfileSetting, cloudinaryUploadPresetSocialPreviewSetting, cloudinaryUploadPresetSpotlightSetting } from './ImageUpload';
import { makeCloudinaryImageUrl } from '../common/CloudinaryImage2';

const styles = (theme: ThemeType): JssStyles => ({
  root: {
    "& img": {
      display: "block",
      marginBottom: 8,
    },
  },
  buttonRow: {
    margin: 'auto',
  },
  button: {
    background: theme.palette.buttons.imageUpload.background,
    "&:hover": {
      background: theme.palette.buttons.imageUpload.hoverBackground,
    },
    color: theme.palette.text.invertedBackgroundText,
    textTransform: 'none',
    margin: 5,
    fontSize: 14,
  },
  imageBackground: {
    backgroundSize: 'cover',
    backgroundPosition: 'top right',
    width: 370,
    height: 195,
    display: 'flex',
  },
});

const cloudinaryArgsByImageType = {
  socialPreviewImageId: {
    minImageHeight: 400,
    minImageWidth: 700,
    croppingAspectRatio: 1.91,
    croppingDefaultSelectionRatio: 1,
    uploadPreset: cloudinaryUploadPresetSocialPreviewSetting.get(),
  },
}

const formPreviewSizeByImageType = {
  socialPreviewImageId: {
    width: 306,
    height: 160
  },
}

const ImageUpload2 = ({name, document, updateCurrentValues, clearField, label, croppingAspectRatio, placeholderUrl, classes}: {
  name: string,
  document: Object,
  updateCurrentValues: Function,
  clearField: Function,
  label: string,
  croppingAspectRatio?: number,
  placeholderUrl?: string,
  classes: ClassesType
}) => {
  const theme = useTheme();

  const setImageInfo = (error, result) => {
    if (error) {
      throw new Error(error.statusText)
    }
    // currently we ignore all events other than a successful upload -
    // see list here: https://cloudinary.com/documentation/upload_widget_reference#events
    if (result.event !== 'success') {
      return
    }
    const imageInfo = result.info
    if (imageInfo && imageInfo.public_id) {
      setImageId(imageInfo.public_id)
      updateCurrentValues({[name]: imageInfo.public_id})
    } else {
      //eslint-disable-next-line no-console
      console.error("Image Upload failed");
    }
  }

  const uploadWidget = () => {
    const cloudinaryArgs = cloudinaryArgsByImageType[name]
    if (!cloudinaryArgs) throw new Error("Unsupported image upload type")
    // @ts-ignore
    cloudinary.openUploadWidget({
      multiple: false,
      sources: ['local', 'url', 'camera', 'facebook', 'instagram', 'google_drive'],
      cropping: true,
      cloudName: cloudinaryCloudNameSetting.get(),
      theme: 'minimal',
      croppingValidateDimensions: true,
      croppingShowDimensions: true,
      styles: {
        palette: {
            tabIcon: theme.palette.primary.main,
            link: theme.palette.primary.main,
            action: theme.palette.primary.main,
            textDark: "#212121",
        },
        fonts: {
            default: null,
            "'Merriweather', serif": {
                url: "https://fonts.googleapis.com/css?family=Merriweather",
                active: true
            }
        }
      },
      ...cloudinaryArgs,
      ...(croppingAspectRatio ? {croppingAspectRatio} : {})
    }, setImageInfo);
  }
  
  const removeImg = () => {
    clearField()
    setImageId(null)
  }

  const [imageId, setImageId] = useState(() => {
    if (document && document[name]) {
      return document[name];
    }
    return ''
  })
  
  const formPreviewSize = formPreviewSizeByImageType[name]
  if (!formPreviewSize) throw new Error("Unsupported image upload type")
  
  const imageUrl = imageId ? makeCloudinaryImageUrl(imageId, {
    c: "fill",
    dpr: "auto",
    q: "auto",
    f: "auto",
    g: "auto:faces"
  }) : placeholderUrl
  
  return (
    <div className={classes.root} {...formPreviewSize}>
      <Helmet>
        <script src="https://upload-widget.cloudinary.com/global/all.js" type="text/javascript" />
      </Helmet>
      <div className={classes.imageBackground} style={{ backgroundImage: `url(${imageUrl})` }}>
        <div className={classes.buttonRow}>
          <Button onClick={uploadWidget} className={classNames("image-upload-button", classes.button)}>
            {imageId ? `Change` : `Upload ${label}`}
          </Button>
          {imageId && <Button className={classes.button} title="Remove" onClick={removeImg}>
            Remove
          </Button>}
        </div>
      </div>
    </div>
  );
};

(ImageUpload2 as any).contextTypes = {
  updateCurrentValues: PropTypes.func,
  addToSuccessForm: PropTypes.func,
};

const ImageUpload2Component = registerComponent("ImageUpload2", ImageUpload2, {styles});

declare global {
  interface ComponentTypes {
    ImageUpload2: typeof ImageUpload2Component
  }
}
