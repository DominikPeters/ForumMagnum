import SelectQuery from "../../lib/sql/SelectQuery";
import Table from "../../lib/sql/Table";
import { getCollection, Globals } from "../vulcan-lib";

/**
 * Translates a mongo find query to SQL for debugging purposes.  Requires a server running because the query builder uses collections, etc.
 */
Globals.findToSQL = ({ tableName, selector, options }: { tableName: CollectionNameString, selector: AnyBecauseTodo, options?: MongoFindOptions<DbObject> }) => {
  const table = Table.fromCollection(getCollection(tableName));
  const select = new SelectQuery<DbObject>(table, selector, options);
  const { sql, args } = select.compile();
  // eslint-disable-next-line no-console
  console.log({ sql, args });
};
