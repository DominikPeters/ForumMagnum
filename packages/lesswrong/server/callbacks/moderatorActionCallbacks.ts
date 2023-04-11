import { isActionActive, MODERATOR_ACTION_TYPES } from '../../lib/collections/moderatorActions/schema';
import { getSignatureWithNote } from '../../lib/collections/users/helpers';
import { loggerConstructor } from '../../lib/utils/logging';
import { getCollectionHooks } from '../mutationCallbacks';
import { triggerReviewIfNeeded } from './sunshineCallbackUtils';

getCollectionHooks('ModeratorActions').createAfter.add(async function triggerReview(doc) {
  const logger = loggerConstructor('callbacks-moderatoractions');
  logger('ModeratorAction created, triggering review if necessary')
  if (isActionActive(doc)) {
    logger('isActionActive truthy')
    void triggerReviewIfNeeded(doc.userId, true);
  }
  return doc;
});

getCollectionHooks('ModeratorActions').createAsync.add(async function updateNotes({ newDocument, currentUser, context }) {
  const moderatedUserId = newDocument.userId;
  const moderatedUser = await context.loaders.Users.load(moderatedUserId);
  // In the case where there isn't a currentUser, that means that the moderator action was created using automod (via callback) rather than being manually applied
  const responsibleAdminName = currentUser?.displayName ?? 'Automod';
  const modActionDescription = MODERATOR_ACTION_TYPES[newDocument.type];
  const newNote = getSignatureWithNote(responsibleAdminName, ` "${modActionDescription}"`);
  const oldNotes = moderatedUser.sunshineNotes ?? '';
  const updatedNotes = `${newNote}${oldNotes}`;

  void context.Users.rawUpdateOne({ _id: moderatedUserId }, { $set: { sunshineNotes: updatedNotes } });
});
