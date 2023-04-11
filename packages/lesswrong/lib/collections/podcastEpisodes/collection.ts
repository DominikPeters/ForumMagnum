import schema from './schema';
import { createCollection } from '../../vulcan-lib';
import { addUniversalFields, getDefaultResolvers, getDefaultMutations } from '../../collectionUtils';
import { userIsAdmin, userIsPodcaster } from '../../vulcan-users';
import { forumTypeSetting } from '../../instanceSettings';

export const PodcastEpisodes: PodcastEpisodesCollection = createCollection({
  collectionName: 'PodcastEpisodes',
  typeName: 'PodcastEpisode',
  collectionType: forumTypeSetting.get() === 'EAForum' ? 'pg' : 'mongo',
  schema,
  resolvers: getDefaultResolvers('PodcastEpisodes'),
  mutations: getDefaultMutations('PodcastEpisodes', {
    newCheck(user) {
      return userIsAdmin(user) || userIsPodcaster(user);
    },
    editCheck(user) {
      return userIsAdmin(user) || userIsPodcaster(user);
    },
  })
});

addUniversalFields({ collection: PodcastEpisodes });

export default PodcastEpisodes;
