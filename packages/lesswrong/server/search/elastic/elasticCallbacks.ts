import {
  AlgoliaIndexCollectionName,
  algoliaIndexedCollectionNames,
} from "../../../lib/search/algoliaUtil";
import { getCollectionHooks } from "../../mutationCallbacks";
import ElasticClient from "./ElasticClient";
import ElasticExporter from "./ElasticExporter";
import { isElasticEnabled } from "./elasticSettings";

export const elasticSyncDocument = (
  collectionName: AlgoliaIndexCollectionName,
  documentId: string,
) => {
  try {
    const client = new ElasticClient();
    const exporter = new ElasticExporter(client);
    void exporter.updateDocument(collectionName, documentId);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[${collectionName}] Failed to index Elasticsearch document:`, e);
  }
}

if (isElasticEnabled) {
  for (const collectionName of algoliaIndexedCollectionNames) {
    const callback = ({_id}: DbObject) => elasticSyncDocument(collectionName, _id);
    getCollectionHooks(collectionName).createAfter.add(callback);
    getCollectionHooks(collectionName).updateAfter.add(callback);
  }
}
