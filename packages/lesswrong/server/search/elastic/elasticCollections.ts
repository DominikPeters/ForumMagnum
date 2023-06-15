import { AlgoliaIndexCollectionName, algoliaIndexedCollectionNames } from "../../../lib/search/algoliaUtil";

export const elasticIndexedCollectionNames = [
  ...algoliaIndexedCollectionNames,
  "Localgroups",
] as const;

export type ElasticIndexCollectionName = AlgoliaIndexCollectionName | "Localgroups";
