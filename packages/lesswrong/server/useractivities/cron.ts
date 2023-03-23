/* eslint-disable no-console */
import { chunk, max } from 'lodash/fp';
import { randomId } from '../../lib/random';
import { getSqlClientOrThrow } from '../../lib/sql/sqlClient';
import { addCronJob } from '../cronUtil';
import { Vulcan } from '../vulcan-lib';
import { ActivityFactor, getUserActivityFactors } from './getUserActivityFactors';

const ACTIVITY_WINDOW_HOURS = 21 * 24; // 3 weeks

/**
 * Assert that all the activityArrays in the UserActivities table are the correct (and identical) length,
 * and have the correct start and end dates. Drop any rows that are inconsistent.
 *
 * In practice this should never do anything, but it will stop the data getting badly out of sync if
 * something goes wrong.
 */
async function assertTableIntegrity(dataDb: SqlClient) {
  // Step 1: Check if all rows have the same startDate and endDate
  const dateCheckResult = await dataDb.one(`
    SELECT COUNT(DISTINCT "startDate") AS start_count, COUNT(DISTINCT "endDate") AS end_count
    FROM "UserActivities";
  `);

  if (dateCheckResult.start_count > 1 || dateCheckResult.end_count > 1) {
    // eslint-disable-next-line no-console
    console.error('UserActivities table has rows with different start and end dates. Dropping rows to fix this.');

    // Delete rows with different startDate and endDate
    await dataDb.none(`
      DELETE FROM "UserActivities"
      WHERE "startDate" <> (SELECT MIN("startDate") FROM "UserActivities")
         OR "endDate" <> (SELECT MIN("endDate") FROM "UserActivities");
    `);
  }

  // Step 2: Check if the array of activity has the correct length for each row
  const correctActivityLength = await dataDb.one(`
    SELECT EXTRACT(EPOCH FROM (MIN("endDate") - MIN("startDate"))) / 3600 AS correct_length
    FROM "UserActivities";
  `);
  const correctActivityLengthInt = parseInt(correctActivityLength.correct_length);
  
  if (!correctActivityLengthInt) return

  // Delete rows with an array of activity that is the wrong length
  await dataDb.none(`
    DELETE FROM "UserActivities"
    WHERE array_length("activityArray", 1) <> $1;
  `, [correctActivityLengthInt]);
}

/**
 * Get the start and end date for the next user activity update. startDate will be the end date of the
 * current rows in the UserActivities table, or 7 days ago if there are no rows. endDate will be the current time,
 * minus a day so as to ignore the current day's activity.
 */
async function getStartEndDate(dataDb: SqlClient) {
  const { last_end_date, last_start_date } = await dataDb.one(`
    SELECT MAX("endDate") AS last_end_date, MIN("startDate") AS last_start_date
    FROM "UserActivities";
  `);

  const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
  const fallbackStartDate = new Date(yesterday.getTime() - (7 * 24 * 60 * 60 * 1000));
  const lastEndDate = last_end_date ? new Date(last_end_date) : fallbackStartDate;
  const prevStartDate = last_start_date ? new Date(last_start_date) : undefined;
  
  // Round down lastEndDate to the nearest hour
  lastEndDate.setMinutes(0, 0, 0);

  const newEndDate = new Date(yesterday.getTime());
  // Round down endDate to the nearest hour
  newEndDate.setHours(newEndDate.getHours(), 0, 0, 0);

  return {
    prevStartDate,
    updateStartDate: lastEndDate,
    updateEndDate: newEndDate,
  };
}

interface ConcatNewActivityParams {
  dataDb: SqlClient;
  activityFactors: ActivityFactor[];
  prevStartDate: Date;
  updateStartDate: Date;
  updateEndDate: Date;
  visitorIdType: 'userId' | 'clientId';
}

/**
 * Update UserActivities table with new activity data
 *
 * After this function is run:
 *  - Every user user who was active in last ACTIVITY_WINDOW_HOURS (28 days)
 *    will have an array of activity representing their activity in each hour.
 *    All of these arrays will be the same length (i.e. we zero-pad as necessary)
 *  - Rows from inactive users will be deleted
 */
async function concatNewActivity({dataDb, activityFactors, prevStartDate, updateStartDate, updateEndDate, visitorIdType}: ConcatNewActivityParams) {
  // remove activityFactors with userOrClientId that is not 17 chars (userId and clientId stored verbatim from the event, which means people can insert fake values)
  const cleanedActivityFactors = activityFactors.filter(({userOrClientId}) => userOrClientId.length <= 17)

  // Get the existing user IDs from the UserActivities table, required to distinguish between newly active users and existing users
  const existingUserIds = (await dataDb.any(`
    SELECT "visitorId" FROM "UserActivities" where "type" = '${visitorIdType}';
  `)).map(({ visitorId }) => visitorId);
  // Go back to the start of the activity window, up to a maximum of ACTIVITY_WINDOW_HOURS in the past
  const paddedStartDate = max([prevStartDate, new Date(updateEndDate.getTime() - (ACTIVITY_WINDOW_HOURS * 60 * 60 * 1000))]) ?? prevStartDate;
  
  // First case: Add rows for users who are newly active (zero padding the end as necessary)

  // Prepare the new user data to be inserted in the UserActivities table
  const newUsersData = cleanedActivityFactors
    .filter(({ userOrClientId }) => !existingUserIds.includes(userOrClientId))
    .map(({ userOrClientId, activityArray: activity_array }) => {
      // paddedArray should be [...activity_array], plus zero padding going back to paddedStartDate:
      const zeroPaddingLength = Math.floor((updateEndDate.getTime() - paddedStartDate.getTime()) / (60 * 60 * 1000)) - activity_array.length
      const zeroPadding = Array(zeroPaddingLength).fill(0);
      const paddedArray = [...activity_array, ...zeroPadding];
      return { userOrClientId, paddedArray };
    });

  // Insert the new user data in a single query
  if (newUsersData.length > 0) {
    const newUsersDataChunked = chunk(1000, newUsersData)
    console.log(`Inserting ${newUsersData.length} new rows into UserActivities table, in ${newUsersDataChunked.length} chunks`)
    
    for (const dataChunk of newUsersDataChunked) {
      const placeholders = dataChunk.map((_, index) => `($${(index * 5) + 1}, $${(index * 5) + 2}, $${(index * 5) + 3}, $${(index * 5) + 4}, $${(index * 5) + 5}, '${visitorIdType}')`).join(', ');
      const insertQuery = `
        INSERT INTO "UserActivities" ("_id", "visitorId", "activityArray", "startDate", "endDate", "type")
        VALUES ${placeholders}
      `;
      const queryParams = dataChunk.flatMap(({ userOrClientId, paddedArray }) => {
        return [randomId(), userOrClientId, paddedArray, paddedStartDate.toISOString(), updateEndDate.toISOString()];
      });
      await dataDb.none(insertQuery, queryParams);
    }
  }

  // Second case: Append the new activity to users' rows who were previously active.
  // Note the truncation ([:${ACTIVITY_WINDOW_HOURS}]) to ensure that the array of activity is the correct length
  const existingUsersData = cleanedActivityFactors.filter(({ userOrClientId }) => existingUserIds.includes(userOrClientId));
  if (existingUsersData.length > 0) {
    const existingUsersDataChunked = chunk(1000, existingUsersData)
    console.log(`Updating ${existingUsersData.length} existing rows for which there is new activity, in ${existingUsersDataChunked.length} chunks`)
    
    for (const dataChunk of existingUsersDataChunked) {
      const tempTableValues = dataChunk.map(({ userOrClientId, activityArray: activity_array }) => `('${userOrClientId}', ARRAY[${activity_array.join(', ')}])`).join(', ');
      const updateQuery = `
        WITH new_activity AS (
          SELECT * FROM (VALUES ${tempTableValues}) AS t(user_id, activity_array)
        )
        UPDATE "UserActivities"
        SET
          "activityArray" = (array_cat(new_activity.activity_array, "UserActivities"."activityArray"))[:${ACTIVITY_WINDOW_HOURS}],
          "startDate" = $1,
          "endDate" = $2
        FROM new_activity
        WHERE
          "UserActivities"."visitorId" = new_activity.user_id
          AND "UserActivities"."type" = '${visitorIdType}';
      `;
      await dataDb.none(updateQuery, [paddedStartDate.toISOString(), updateEndDate.toISOString()]);
    }
  }

  // Third case: Zero-pad the start of rows for users who were previously active but have no new activity
  // (i.e. they have existing rows in the table but have not been active since we last updated the table)
  const inactiveExistingUserIds = existingUserIds.filter(id => !existingUsersData.some(({ userOrClientId }) => userOrClientId === id));
  if (inactiveExistingUserIds.length > 0) {
    const newActivityHours = Math.ceil((updateEndDate.getTime() - updateStartDate.getTime()) / (1000 * 60 * 60));
    const inactiveExistingUserIdsChunked = chunk(1000, inactiveExistingUserIds)
    console.log(`Adding zero-padding to ${inactiveExistingUserIds.length} existing rows for which there is no new activity, in ${inactiveExistingUserIdsChunked.length} chunks`)

    for (const userIdsChunk of inactiveExistingUserIdsChunked) {
      const updateQuery = `
        UPDATE "UserActivities"
        SET
          "activityArray" = (array_cat(ARRAY[${Array(newActivityHours).fill(0).join(', ')}]::double precision[], "UserActivities"."activityArray"))[:${ACTIVITY_WINDOW_HOURS}],
          "startDate" = $1,
          "endDate" = $2
        WHERE
          "UserActivities"."visitorId" IN (${userIdsChunk.map((_, index) => `$${index + 3}`).join(', ')})
          AND "UserActivities"."type" = '${visitorIdType}';
      `;
      const queryParams = [paddedStartDate.toISOString(), updateEndDate.toISOString(), ...userIdsChunk];
      await dataDb.none(updateQuery, queryParams);
    }
  }

  // Fourth case: Every user has had their activity updated now. Remove rows for users who are no longer active in the last
  // ACTIVITY_WINDOW_HOURS (i.e. the activity array is all zeros)
  const countQuery = `
    SELECT COUNT(*) as delete_count FROM "UserActivities"
    WHERE
      "UserActivities"."type" = '${visitorIdType}'
      AND array_position("UserActivities"."activityArray", 1) IS NULL; -- no "1" in the array
  `;
  const deleteQuery = `
    DELETE FROM "UserActivities"
    WHERE
      "UserActivities"."type" = '${visitorIdType}'
      AND array_position("UserActivities"."activityArray", 1) IS NULL; -- no "1" in the array
  `;
  const count = (await dataDb.one(countQuery)).delete_count;
  console.log(`Deleting ${count} rows for users who have no activity in the last ${ACTIVITY_WINDOW_HOURS} hours`)
  await dataDb.none(deleteQuery);
}

/**
 * Update the UserActivities table with the latest activity data from the analytics database
 */
export async function updateUserActivities(props?: {updateStartDate?: Date, updateEndDate?: Date}) {
  const dataDb = await getSqlClientOrThrow();
  if (!dataDb) {
    throw new Error("updateUserActivities: couldn't get database connection");
  };

  await assertTableIntegrity(dataDb);
  const { prevStartDate, updateStartDate, updateEndDate } = {...(await getStartEndDate(dataDb)), ...props};

  // Get the most recent activity data from the analytics database
  const activityFactors = await getUserActivityFactors(updateStartDate, updateEndDate);

  console.log(`Updating user activity for ${activityFactors.length} users between ${updateStartDate} and ${updateEndDate}`);

  const userActivityFactors = activityFactors
    .filter(factor => factor.userOrClientId?.startsWith('u:'))
    .map(factor => ({...factor, userOrClientId: factor.userOrClientId.slice(2)}));
  const clientActivityFactors = activityFactors
    .filter(factor => factor.userOrClientId?.startsWith('c:'))
    .map(factor => ({...factor, userOrClientId: factor.userOrClientId.slice(2)}));

  // Update the UserActivities table with the new activity data
  await concatNewActivity({dataDb, activityFactors: userActivityFactors, prevStartDate: prevStartDate ?? updateStartDate, updateStartDate, updateEndDate, visitorIdType: 'userId'});
  await concatNewActivity({dataDb, activityFactors: clientActivityFactors, prevStartDate: prevStartDate ?? updateStartDate, updateStartDate, updateEndDate, visitorIdType: 'clientId'});
}

export async function backfillUserActivities() {
  const dataDb = await getSqlClientOrThrow();
  if (!dataDb) {
    throw new Error("updateUserActivities: couldn't get database connection");
  };

  // Clear the current data in the UserActivities collection
  await dataDb.none(`DELETE FROM "UserActivities";`);

  // Get the current date and time (rounded down to the hour)
  const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
  yesterday.setMinutes(0);
  yesterday.setSeconds(0);
  yesterday.setMilliseconds(0);

  // Calculate the starting date for the backfill (ACTIVITY_WINDOW_HOURS ago)
  const startDate = new Date(yesterday);
  startDate.setHours(startDate.getHours() - ACTIVITY_WINDOW_HOURS);

  // Loop over the range of dates in 24-hour increments
  for (let currentDate = startDate; currentDate < yesterday; currentDate.setHours(currentDate.getHours() + 24)) {
    const endDate = new Date(currentDate);
    endDate.setHours(endDate.getHours() + 24);
    
    // Make sure we don't go past 'now'
    if (endDate > yesterday) {
      endDate.setTime(yesterday.getTime());
    }

    // Update the UserActivities table with the activity data for the current date range
    await updateUserActivities({ updateStartDate: currentDate, updateEndDate: endDate });
  }
}


addCronJob({
  name: 'updateUserActivitiesCron',
  interval: 'every 3 hours',
  async job() {
    await updateUserActivities();
  }
});

Vulcan.updateUserActivities = updateUserActivities;
Vulcan.backfillUserActivities = backfillUserActivities;
