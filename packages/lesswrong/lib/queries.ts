
export const elicitDataFragment = `
  _id
  title
  notes
  resolvesBy
  resolution
  predictions {
    _id,
    predictionId,
    prediction,
    createdAt,
    notes,
    sourceUrl,
    sourceId,
    binaryQuestionId
    creator {
      _id,
      displayName,
      sourceUserId
      lwUser {
        ...UsersMinimumInfo
      }
    }
  }
`;

export const allQueries = {
  RecommendationsQuery: `query RecommendationsQuery($count: Int, $algorithm: JSON) {
    Recommendations(count: $count, algorithm: $algorithm) {
      ...PostsListWithVotesAndSequence
    }
  }`,
  MozillaHubsRoomData: `
    query MozillaHubsRoomData($roomId: String) {
      MozillaHubsRoomData(roomId: $roomId) {
        id
        previewImage
        lobbyCount
        memberCount
        roomSize
        description
        url
        name
      }
    }
  `,
  EmailPreviewQuery: `
    query EmailPreviewQuery($notificationIds: [String], $postId: String) {
      EmailPreview(notificationIds: $notificationIds, postId: $postId) { to subject html text }
    }
  `,
  ArbitalPageRequest: `
    query ArbitalPageRequest($arbitalSlug: String!) {
      ArbitalPageData(pageAlias: "$arbitalSlug") {
        title
        html
      }
    }
  `,
  GetRandomTag: `
    query GetRandomTag {
      RandomTag {slug}
    }
  `,
  AdminMetadataQuery: `
    query AdminMetadataQuery {
      AdminMetadata
    }
  `,
  MigrationsDashboardQuery: `
    query MigrationsDashboardQuery {
      MigrationsDashboard {
        migrations {
          name
          dateWritten
          runs { name started finished succeeded }
          lastRun
        }
      }
    }
  `,
  ElicitQuery: `
    query ElicitQuery($questionId: String) {
      ElicitBlockData(questionId: $questionId) {
       ${elicitDataFragment}
      }
    }
  `,
  PostAnalyticsQuery: `
    query PostAnalyticsQuery($postId: String!) {
      PostAnalytics(postId: $postId) {
        allViews
        uniqueClientViews
        uniqueClientViews10Sec
        medianReadingTime
        uniqueClientViews5Min
        uniqueClientViewsSeries {
          date
          uniqueClientViews
        }
      }
    }
  `,
  CoronaVirusData: `
    query CoronaVirusData {
      CoronaVirusData {
        range
        majorDimension
        values {
          accepted
          imp
          link
          shortDescription
          url
          description
          domain
          type
          reviewerThoughts
          foundVia
          sourceLink
          sourceLinkDomain
          lastUpdated
          title
          dateAdded
          category
        } 
      }
    }
  `,
  TagUpdatesInTimeBlock: `
    query TagUpdatesInTimeBlock($before: Date!, $after: Date!) {
      TagUpdatesInTimeBlock(before: $before, after: $after) {
        tag {
          ...TagBasicInfo
        }
        revisionIds
        commentCount
        commentIds
        lastRevisedAt
        lastCommentedAt
        added
        removed
        users {
          ...UsersMinimumInfo
        }
      }
    }
  `,
  ContinueReadingQuery: `
    query ContinueReadingQuery {
      ContinueReading {
        sequence {
          _id
          title
          gridImageId
          canonicalCollectionSlug
        }
        collection {
          _id
          title
          slug
          gridImageId
        }
        nextPost {
          ...PostsList
        }
        numRead
        numTotal
        lastReadTime
      }
    }
  `,
  PetrovDayLaunchResolvers: `
    query PetrovDayLaunchResolvers {
      PetrovDayCheckIfIncoming {
        launched
        createdAt
      }
    }
  `,
  RevisionsDiff: `
    query RevisionsDiff($collectionName: String!, $fieldName: String!, $id: String!, $beforeRev: String, $afterRev: String!, $trim: Boolean) {
      RevisionsDiff(collectionName: $collectionName, fieldName: $fieldName, id: $id, beforeRev: $beforeRev, afterRev: $afterRev, trim: $trim)
    }
  `,
  GetTwoUserTopicRecommendations: `
    query getTopicRecommendations($userId: String!, $targetUserId: String!, $limit: Int!) {
      GetTwoUserTopicRecommendations(userId: $userId, targetUserId: $targetUserId, limit: $limit) {
        comment {
          _id
          contents {
            html
            plaintextMainText
          }
        }
        recommendationReason
        yourVote
        theirVote
      }
    }
  `,
  UserTopTags: `
    query UserTopTags($userId: String!) {
      UserTopTags(userId: $userId) {
        tag {
          name
          _id
        }
        commentCount
      }
    }
  `,
  UsersReadPostsOfTargetUser: `
    query UsersReadPostsOfTargetUser($userId: String!, $targetUserId: String!, $limit: Int!) {
      UsersReadPostsOfTargetUser(userId: $userId, targetUserId: $targetUserId, limit: $limit) {
        _id
        title
        slug
      }
    }
  `,
  UsersRecommendedCommentsOfTargetUser: `
    query UsersRecommendedCommentsOfTargetUser($userId: String!, $targetUserId: String!, $limit: Int!) {
      UsersRecommendedCommentsOfTargetUser(userId: $userId, targetUserId: $targetUserId, limit: $limit) {
        _id
        postId
        contents {
          html
          plaintextMainText
        }
      }
    }
  `,
  GetUserDialogueUsefulData: `
    query getDialogueUsers {
      GetUserDialogueUsefulData {
        dialogueUsers {
          _id
          displayName
        }
        topUsers {
          _id
          displayName
          username
          power_values
          agreement_values
          vote_counts
          total_power
          total_agreement
          recently_active_matchmaking
        }
        activeDialogueMatchSeekers {
          _id
          displayName
        }
      }
    }
  `
};
