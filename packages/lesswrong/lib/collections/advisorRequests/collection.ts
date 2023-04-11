import schema from './schema';
import { createCollection } from '../../vulcan-lib';
import { addUniversalFields, getDefaultResolvers } from '../../collectionUtils'
import { getDefaultMutations } from '../../vulcan-core/default_mutations';
import { forumTypeSetting } from '../../instanceSettings';

export const AdvisorRequests: AdvisorRequestsCollection = createCollection({
  collectionName: 'AdvisorRequests',
  typeName: 'AdvisorRequest',
  collectionType: forumTypeSetting.get() === 'EAForum' ? 'pg' : 'mongo',
  schema,
  resolvers: getDefaultResolvers('AdvisorRequests'),
  mutations: getDefaultMutations('AdvisorRequests'),
  logChanges: true,
});

addUniversalFields({collection: AdvisorRequests})

export default AdvisorRequests;
