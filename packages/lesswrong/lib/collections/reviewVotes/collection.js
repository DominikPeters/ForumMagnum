import schema from './schema.js';
import Users from 'meteor/vulcan:users';
import { createCollection, getDefaultResolvers, getDefaultMutations} from 'meteor/vulcan:core';
import { addUniversalFields } from '../../collectionUtils'

export const ReviewVotes = createCollection({
  collectionName: 'ReviewVotes',
  typeName: 'ReviewVote',
  schema,
  resolvers: getDefaultResolvers('ReviewVotes'),
  mutations: getDefaultMutations('ReviewVotes'),
});

addUniversalFields({collection: ReviewVotes})

const membersActions = [
  'reviewVotes.new',
  'reviewVotes.view.own',
];
Users.groups.members.can(membersActions);

const sunshineRegimentActions = [
  'reviewVotes.edit.all',
  'reviewVotes.remove.all',
  'reviewVotes.view.all',
];
Users.groups.sunshineRegiment.can(sunshineRegimentActions);

ReviewVotes.checkAccess = (user, document) => {
  if (!user || !document) return false;
  return (
    document.userId === user._id ? Users.canDo(user, 'reviewVotes.view.own') : Users.canDo(user, `reviewVotes.view.all`)
  )
};

export default ReviewVotes;
