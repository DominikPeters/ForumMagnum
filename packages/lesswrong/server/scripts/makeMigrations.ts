/* eslint-disable no-console */
import { format } from 'pg-formatter'; // FIXME this requires perl to be installed, make sure it's installed in CI
import { Vulcan, getCollection } from "../vulcan-lib";
import { getAllCollections } from "../../lib/vulcan-lib/getCollection";
import Table from "../../lib/sql/Table";
import CreateTableQuery from "../../lib/sql/CreateTableQuery";
import md5 from 'md5';
import { fs } from 'mz';
import path from 'path';
import { exec } from 'child_process';
import { acceptMigrations, migrationsPath } from './acceptMigrations';

const ROOT_PATH = path.join(__dirname, "../../../");
const acceptedSchemePath = (rootPath: string) => path.join(rootPath, "schema/accepted_schema.sql");
const newSchemaPath = (rootPath: string) => path.join(rootPath, "schema/schema_to_accept.sql");

const migrationTemplateHeader = `/**
 * Generated on %TIMESTAMP% by \`yarn makemigrations\`
 * The following schema changes were detected:
`

const migrationTemplateFooter = `
 * (run \`git diff --no-index schema/accepted_schema.sql schema/schema_to_accept.sql\` to see this more clearly)
 *
 * - [ ] Write a migration to represent these changes
 * - [ ] Rename this file to something more readable if you wish
 * - [ ] Uncomment \`acceptsSchemaHash\` below
 * - [ ] Run \`yarn acceptmigrations\` to update the accepted schema hash (running makemigrations again will also do this)
 */
// export const acceptsSchemaHash = "%HASH%";

export const up = async ({db}: MigrationContext) => {
  // TODO
}

export const down = async ({db}: MigrationContext) => {
  // TODO, not required
}
`

const generateMigration = async ({
  oldSchemaFile, newSchemaFile, newHash, rootPath
}: {oldSchemaFile: string, newSchemaFile: string, newHash: string, rootPath: string
}) => {
  const execRun = (cmd) => {
    return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => resolve(stdout))
    })
  }
  
  const diff: string = await execRun(`git diff --no-index ${oldSchemaFile} ${newSchemaFile} --unified=1`) as string;
  const paddedDiff = diff.replace(/^/gm, ' * ');

  let contents = "";
  contents += migrationTemplateHeader.replace("%TIMESTAMP%", new Date().toISOString());
  contents += paddedDiff;
  contents += migrationTemplateFooter.replace("%HASH%", newHash);
  
  const fileTimestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
  const fileName = `${fileTimestamp}.auto.ts`;
  
  await fs.writeFile(path.join(migrationsPath(rootPath), fileName), contents);
}

const getCreateTableQueryForCollection = (collectionName: string): string => {
  const collection = getCollection(collectionName as any);
  if (!collection) throw new Error(`Invalid collection: ${collectionName}`);
  
  const table = Table.fromCollection(collection);
  const createTableQuery = new CreateTableQuery(table);
  const compiled = createTableQuery.compile();

  const sql = compiled.sql;
  const args = createTableQuery.compile().args;
  
  if (args.length) throw new Error(`Unexpected arguments: ${args}`);
  
  return sql;
}

Vulcan.makeMigrations = async ({write=true, rootPath=ROOT_PATH}: {write: boolean, rootPath: string}) => {
  console.log(`=== Checking for schema changes ===`);
  const {acceptsSchemaHash: acceptedHash, acceptedByMigration, timestamp} = await acceptMigrations({write, rootPath});

  const currentHashes: Partial<Record<CollectionNameString, string>> = {};
  let schemaFileContents = "";

  // Sort collections by name, so that the order of the output is deterministic
  const collectionNames = getAllCollections().map(c => c.collectionName).sort();
  console.log(collectionNames);
  let failed: string[] = [];

  for (const collectionName of collectionNames) {
    try {
      const sql = getCreateTableQueryForCollection(collectionName);

      const hash = md5(sql.toLowerCase());
      currentHashes[collectionName] = hash;
      
      schemaFileContents += `-- Schema for "${collectionName}", hash: ${hash}\n`
      schemaFileContents += `${format(sql)}\n`;
    } catch (e) {
      console.error(`Failed to check schema for collection ${collectionName}`);
      failed.push(collectionName);
      console.error(e);
    }
  }

  if (failed.length) throw new Error(`Failed to generate schema for ${failed.length} collections: ${failed}`)
  
  const overallHash = md5(Object.values(currentHashes).sort().join());
  const schemaFileHeader = `-- Accepted on ${timestamp}${acceptedByMigration ? " by " + acceptedByMigration : ''}\n-- Overall schema hash: ${overallHash}\n\n`;
  
  const newSchemaFile = newSchemaPath(rootPath);
  const acceptedSchemaFile = acceptedSchemePath(rootPath);
  if (overallHash !== acceptedHash) {
    if (write) {
      fs.writeFileSync(newSchemaFile, schemaFileHeader + schemaFileContents);
      await generateMigration({oldSchemaFile: acceptedSchemaFile, newSchemaFile, newHash: overallHash, rootPath});
    }
    throw new Error(`Schema has changed, write a migration to accept the new hash: ${overallHash}`);
  }
  if (write) {
    await fs.writeFile(acceptedSchemaFile, schemaFileHeader + schemaFileContents);
    if (fs.existsSync(newSchemaFile)) {
      await fs.unlink(newSchemaFile);
    }
  }

  console.log("=== Done ===");
}

export default Vulcan.makeMigrations;
