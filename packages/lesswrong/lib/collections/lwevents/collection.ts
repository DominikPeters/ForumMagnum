import schema from './schema';
import { userOwns, userCanDo } from '../../vulcan-users/permissions';
import { createCollection } from '../../vulcan-lib';
import { addUniversalFields, getDefaultResolvers } from '../../collectionUtils'
import { getDefaultMutations, MutationOptions } from '../../vulcan-core/default_mutations';
import { isEAForum } from '../../instanceSettings';

const options: MutationOptions<DbLWEvent> = {
  newCheck: (user: DbUser|null, document: DbLWEvent|null) => {
    if (!user || !document) return false;
    return userOwns(user, document) ? userCanDo(user, 'events.new.own') : userCanDo(user, `events.new.all`)
  },

  editCheck: (user: DbUser|null, document: DbLWEvent|null) => {
    if (!user || !document) return false;
    return userCanDo(user, `events.edit.all`)
  },

  removeCheck: (user: DbUser|null, document: DbLWEvent|null) => {
    if (!user || !document) return false;
    return userCanDo(user, `events.remove.all`)
  },
}


export const LWEvents: LWEventsCollection = createCollection({
  collectionName: 'LWEvents',
  typeName: 'LWEvent',
  collectionType: isEAForum ? "pg" : "mongo",
  schema,
  resolvers: getDefaultResolvers('LWEvents'),
  mutations: getDefaultMutations('LWEvents', options),
});

addUniversalFields({
  collection: LWEvents,
  createdAtOptions: {viewableBy: ['members']},
});

export default LWEvents;
