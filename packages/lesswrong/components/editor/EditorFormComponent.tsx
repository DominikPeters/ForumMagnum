import React, { useState, useCallback, useRef, useEffect } from 'react';
import { registerComponent, Components } from '../../lib/vulcan-lib';
import { editableCollectionsFieldOptions } from '../../lib/editor/make_editable';
import { getLSHandlers, getLSKeyPrefix } from './localStorageHandlers'
import { userCanCreateCommitMessages } from '../../lib/betas';
import { useCurrentUser } from '../common/withUser';
import { Editor, EditorChangeEvent, getUserDefaultEditor, getInitialEditorContents, getBlankEditorContents, EditorContents, isBlank, serializeEditorContents, EditorTypeString, styles, FormProps, shouldSubmitContents } from './Editor';
import withErrorBoundary from '../common/withErrorBoundary';
import PropTypes from 'prop-types';
import * as _ from 'underscore';

const autosaveInterval = 3000; //milliseconds

export function isCollaborative(post: DbPost, fieldName: string): boolean {
  if (!post) return false;
  if (!post._id) return false;
  if (fieldName !== "contents") return false;
  if (post.shareWithUsers) return true;
  if (post.sharingSettings?.anyoneWithLinkCan && post.sharingSettings.anyoneWithLinkCan !== "none")
    return true;
  return false;
}

export const EditorFormComponent = ({form, formType, formProps, document, name, fieldName, value, hintText, placeholder, label, commentStyles, classes}: {
  form: any,
  formType: "edit"|"new",
  formProps: FormProps,
  document: any,
  name: any,
  fieldName: any,
  value: any,
  hintText: string,
  placeholder: string,
  label: string,
  commentStyles: boolean,
  classes: ClassesType,
}, context: any) => {
  const { commentEditor, collectionName, hideControls } = (form || {});
  const { editorHintText, maxHeight } = (formProps || {});
  const { updateCurrentValues } = context;
  const currentUser = useCurrentUser();
  const editorRef = useRef<Editor|null>(null);
  const hasUnsavedDataRef = useRef({hasUnsavedData: false});
  const isCollabEditor = isCollaborative(document, fieldName);
  
  const getLocalStorageHandlers = useCallback((editorType: EditorTypeString) => {
    const getLocalStorageId = editableCollectionsFieldOptions[collectionName as CollectionNameString][fieldName].getLocalStorageId;
    return getLSHandlers(getLocalStorageId, document, name,
      getLSKeyPrefix(editorType)
    );
  }, [collectionName, document, name, fieldName]);
  
  const [contents,setContents] = useState(() => getInitialEditorContents(
    value, document, fieldName, currentUser
  ));
  const [initialEditorType] = useState(contents.type);
  
  const defaultEditorType = getUserDefaultEditor(currentUser);
  const currentEditorType = contents.type || defaultEditorType;
  const showEditorWarning = (formType !== "new") && (initialEditorType !== currentEditorType) && (currentEditorType !== 'ckEditorMarkup')
  
  const saveBackup = useCallback((newContents: EditorContents) => {
    if (isBlank(newContents)) {
      getLocalStorageHandlers(currentEditorType).reset();
      hasUnsavedDataRef.current.hasUnsavedData = false;
    } else {
      const serialized = serializeEditorContents(newContents);
      const success = getLocalStorageHandlers(newContents.type).set(serialized);
      
      if (success) {
        hasUnsavedDataRef.current.hasUnsavedData = false;
      }
    }
  }, [getLocalStorageHandlers, currentEditorType]);

  /**
   * Update the edited field (e.g. "contents") so that other form components can access the updated value. The direct motivation for this
   * was for SocialPreviewUpload, which needs to know the body of the post in order to generate a preview description and image.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const throttledSetContentsValue = useCallback(_.throttle(async () => {
    if (!(editorRef.current && shouldSubmitContents(editorRef.current))) return
    
    // Preserve other fields in "contents" which may have been sent from the server
    updateCurrentValues({[fieldName]: {...(document[fieldName] || {}), ...(await editorRef.current.submitData())}})
  }, autosaveInterval, {leading: true}), [autosaveInterval])
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const throttledSaveBackup = useCallback(
    _.throttle(saveBackup, autosaveInterval, {leading: false}),
    [saveBackup, autosaveInterval]
  );
  
  const wrappedSetContents = useCallback((change: EditorChangeEvent) => {
    const {contents,autosave} = change;
    setContents(contents);
    
    // Only save to localStorage if not using collaborative editing, since with
    // collaborative editing stuff is getting constantly sent through a
    // websocket and saved that way.
    if (!isCollabEditor) {
      if (!isBlank(contents)) {
        hasUnsavedDataRef.current.hasUnsavedData = true;
      }
    }
    
    // Hack: Fill in ${fieldName}_type with the editor type on every keystroke, to enable other
    // form components (in particular PostSharingSettings) to check whether we're
    // using CkEditor vs draftjs vs etc. Update the actual contents with a throttled
    // callback to improve performance. Note that the contents are always recalculated on
    // submit anyway, setting them here is only for the benefit of other form components (e.g. SocialPreviewUpload)
    updateCurrentValues({[`${fieldName}_type`]: change.contents?.type});
    void throttledSetContentsValue()
    
    if (autosave) {
      throttledSaveBackup(contents);
    }
  }, [isCollabEditor, updateCurrentValues, fieldName, throttledSetContentsValue, throttledSaveBackup]);
  
  useEffect(() => {
    const unloadEventListener = (ev: BeforeUnloadEvent) => {
      if (hasUnsavedDataRef?.current?.hasUnsavedData) {
        ev.preventDefault();
        ev.returnValue = 'Are you sure you want to close?';
        return ev.returnValue
      }
    };
    
    window.addEventListener("beforeunload", unloadEventListener);
    return () => {
      window.removeEventListener("beforeunload", unloadEventListener);
    };
  }, [fieldName, hasUnsavedDataRef]);
  
  const onRestoreLocalStorage = useCallback((newState: EditorContents) => {
    wrappedSetContents({contents: newState, autosave: false});
    // TODO: Focus editor
  }, [wrappedSetContents]);
  
  useEffect(() => {
    if (editorRef.current) {
      const cleanupSubmitForm = context.addToSubmitForm(async (submission: any) => {
        if (editorRef.current && shouldSubmitContents(editorRef.current))
          return {
            ...submission,
            [fieldName]: await editorRef.current.submitData()
          };
        else
          return submission;
      });
      const cleanupSuccessForm = context.addToSuccessForm((result: any, form: any, submitOptions: any) => {
        getLocalStorageHandlers(currentEditorType).reset();
        if (editorRef.current && !submitOptions?.redirectToEditor) {
          wrappedSetContents({
            contents: getBlankEditorContents(initialEditorType),
            autosave: false,
          });
        }
        return result;
      });
      return () => {
        cleanupSubmitForm();
        cleanupSuccessForm();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!editorRef.current, fieldName, initialEditorType, context.addToSuccessForm, context.addToSubmitForm]);
  
  const fieldHasCommitMessages = editableCollectionsFieldOptions[collectionName as CollectionNameString][fieldName].revisionsHaveCommitMessages;
  const hasCommitMessages = fieldHasCommitMessages
    && currentUser && userCanCreateCommitMessages(currentUser)
    && (collectionName!=="Tags" || formType==="edit");
  
  const actualPlaceholder = (editorHintText || hintText || placeholder);
  
  if (!document) return null;
  
  return <div>
    {showEditorWarning &&
    <Components.LastEditedInWarning
      initialType={initialEditorType}
      currentType={contents.type}
      defaultType={defaultEditorType}
      value={contents} setValue={wrappedSetContents}
    />
    }
    {!isCollabEditor &&<Components.LocalStorageCheck
      getLocalStorageHandlers={getLocalStorageHandlers}
      onRestore={onRestoreLocalStorage}
    />}
    <Components.Editor
      ref={editorRef}
      _classes={classes}
      currentUser={currentUser}
      label={label}
      formType={formType}
      documentId={document._id}
      collectionName={collectionName}
      fieldName={fieldName}
      initialEditorType={initialEditorType}
      formProps={formProps}
      isCollaborative={isCollabEditor}
      accessLevel={document.myEditorAccess}
      value={contents}
      onChange={wrappedSetContents}
      placeholder={actualPlaceholder}
      commentStyles={commentStyles}
      answerStyles={document.answer}
      questionStyles={document.question}
      commentEditor={commentEditor}
      hideControls={hideControls}
      maxHeight={maxHeight}
      hasCommitMessages={hasCommitMessages ?? undefined}
    />
    {!hideControls && <Components.EditorTypeSelect value={contents} setValue={wrappedSetContents} isCollaborative={isCollaborative(document, fieldName)}/>}
    {!hideControls && collectionName==="Posts" && fieldName==="contents" && !!document._id &&
      <Components.PostVersionHistoryButton
        post={document}
        postId={document._id}
      />
    }
  </div>
}

export const EditorFormComponentComponent = registerComponent('EditorFormComponent', EditorFormComponent, {
  hocs: [withErrorBoundary], styles
});

(EditorFormComponent as any).contextTypes = {
  addToSubmitForm: PropTypes.func,
  addToSuccessForm: PropTypes.func,
  updateCurrentValues: PropTypes.func,
};

declare global {
  interface ComponentTypes {
    EditorFormComponent: typeof EditorFormComponentComponent
  }
}
