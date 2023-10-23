import { Posts } from '../../lib/collections/posts';
import Revisions from '../../lib/collections/revisions/collection';
import { createCollaborativeSession, deleteCkEditorCloudDocument, fetchCkEditorCloudStorageDocument, flushAllCkEditorCollaborations, flushCkEditorCollaboration, postIdToCkEditorDocumentId, saveOrUpdateDocumentRevision } from '../ckEditor/ckEditorWebhook';
import { backfillDialogueMessageInputAttributes } from '../editor/conversionUtils';
import { registerMigration } from './migrationUtils';

registerMigration({
  name: "migrateDialoguesToInputWrappers",
  dateWritten: "2023-10-19",
  idempotent: true,
  action: async () => {
    const dialogues = await Posts.find({ collabEditorDialogue: true }).fetch();

    const dialogueMigrations = dialogues.map(async (dialogue) => {
      const postId = dialogue._id;
      const latestRevisionPromise = Revisions.findOne({ documentId: postId, fieldName: 'contents' }, { sort: { editedAt: -1 } });
      const ckEditorId = postIdToCkEditorDocumentId(postId);
      let html;
      try {
        html = await fetchCkEditorCloudStorageDocument(ckEditorId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log('Error getting remote html of dialogue', { err });
      }

      // If there's no remote session for a dialogue, fall back to migrating the latest revision, then fall back to migrating the post contents
      html ??= (await latestRevisionPromise)?.originalContents.data ?? dialogue.contents.originalContents.data;

      const migratedHtml = await backfillDialogueMessageInputAttributes(html, postId);
      await saveOrUpdateDocumentRevision(postId, migratedHtml);
    
      try {
        await flushCkEditorCollaboration(ckEditorId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log('Failed to delete remote collaborative session', { err });
      }
      try {
        await deleteCkEditorCloudDocument(ckEditorId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log('Failed to delete remote document from storage', { err });
      }
      
      // Push the selected revision
      await createCollaborativeSession(ckEditorId, migratedHtml);
    });

    await Promise.all(dialogueMigrations);

    await flushAllCkEditorCollaborations();
  },
});
