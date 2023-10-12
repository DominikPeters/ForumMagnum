import { userOwns } from '../../vulcan-users/permissions';
import { schemaDefaultValue } from '../../collectionUtils';

const schema: SchemaType<DbNotification> = {
  userId: {
    type: String,
    foreignKey: "Users",
    optional: true,
    canRead: userOwns,
  },
  documentId: {
    type: String,
    // No explicit foreign-key relation because which collection this is depends on notification type
    optional: true,
    canRead: userOwns,
  },
  documentType: {
    type: String,
    optional: true,
    canRead: userOwns,
  },
  extraData: {
    type: Object,
    blackbox: true,
    optional: true,
    canRead: userOwns,
  },
  link: {
    type: String,
    optional: true,
    canRead: userOwns,
  },
  title: {
    type: String,
    optional: true,
    canRead: userOwns,
  },
  message: {
    type: String,
    optional: true,
    canRead: userOwns,
  },
  type: {
    type: String,
    optional: true,
    canRead: userOwns,
  },
  deleted: {
    type: Boolean,
    optional: true,
    canRead: userOwns,
    ...schemaDefaultValue(false),
  },
  viewed: {
    type: Boolean,
    optional: true,
    defaultValue: false,
    canRead: ['members'],
    canCreate: ['members'],
    canUpdate: ['members'],
    ...schemaDefaultValue(false),
  },
  emailed: {
    type: Boolean,
    ...schemaDefaultValue(false),
    canRead: userOwns,
  },
  waitingForBatch: {
    type: Boolean,
    ...schemaDefaultValue(false),
    canRead: userOwns,
  },
};

export type NotificationCountsResult = {
  checkedAt: Date,
  unreadNotifications: number
  unreadPrivateMessages: number
  faviconBadgeNumber: number
}

export default schema;
