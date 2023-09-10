import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { runStartupFunctions } from '../lib/executionEnvironment';
import { setServerSettingsCache, setPublicSettings } from '../lib/settingsCache';
import { closeDatabaseConnection } from '../lib/mongoCollection';
import { waitUntilCallbacksFinished } from '../lib/vulcan-lib/callbacks';
import process from 'process';
import { initGraphQL } from '../server/vulcan-lib/apollo-server/initGraphQL';
import { createVoteableUnionType } from '../server/votingGraphQL';
import { setSqlClient, closeSqlClient, getSqlClientOrThrow } from '../lib/sql/sqlClient';
import {
  preparePgTables,
  createTestingSqlClientFromTemplate,
  dropTestingDatabases,
} from '../server/testingSqlClient';

// Work around an incompatibility between Jest and iconv-lite (which is used
// by mathjax).
require('iconv-lite').encodingExists('UTF-8')
require('encoding/node_modules/iconv-lite').encodingExists('UTF-8')

let pgConnected = false;
const ensurePgConnection = async () => {
  if (!pgConnected) {
    try {
      preparePgTables();
      const {sql} = await createTestingSqlClientFromTemplate("unittest_jest_template");
      setSqlClient(sql);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to connect to postgres:", err.message);
      throw err;
    }
    pgConnected = true;
  }
}

let setupRun = false;
async function oneTimeSetup() {
  if (setupRun) return;
  setupRun = true;

  // We need to require this here instead of importing at the top level to make sure that
  // Jest can do its magic to make ESM mocks work which requires calls to `jest.mock` to
  // be evaluated before any of the mocked modules are loaded by node
  require('../server');

  setServerSettingsCache({});
  setPublicSettings({});

  await ensurePgConnection();

  await runStartupFunctions();

  // define executableSchema
  createVoteableUnionType();
  initGraphQL();
}

jest.setTimeout(20000);

beforeAll(async () => {
  chai.should();
  chai.use(chaiAsPromised);

  await oneTimeSetup();
});

afterEach(async () => {
  await waitUntilCallbacksFinished();
});

afterAll(async () => {
  await waitUntilCallbacksFinished();
  await Promise.all([
    closeDatabaseConnection(),
    closeSqlClient(getSqlClientOrThrow()),
  ]);

  // Our approach to database cleanup is to just delete all the runs older than 1 day.
  // This allows us to inspect the databases created during the last run if necessary
  // for debugging whilst also making sure that we clean up after ourselves eventually
  // (assuming that the tests are run again some day).
  if (process.env.JEST_WORKER_ID === "1") {
    await dropTestingDatabases();
  }
});
