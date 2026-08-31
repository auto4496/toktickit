export type TestDatabaseConfig = {
  testDatabaseUrl?: string;
  developmentDatabaseUrl?: string;
};

const TEST_MARKER = /(^|[_-])test($|[_-])/i;
const UNSAFE_MARKER = /(^|[_-])(dev|development|prod|production|live)($|[_-])/i;

function databaseIdentity(databaseUrl: URL) {
  return {
    databaseName: decodeURIComponent(databaseUrl.pathname.replace(/^\//, '')),
    schemaName: databaseUrl.searchParams.get('schema') ?? 'public',
  };
}

function normalizedDatabaseTarget(databaseUrl: URL) {
  const { databaseName, schemaName } = databaseIdentity(databaseUrl);
  const port = databaseUrl.port || '5432';
  return `${databaseUrl.hostname.toLowerCase()}:${port}/${databaseName}?schema=${schemaName}`;
}

export function requireTestDatabaseUrl({
  testDatabaseUrl,
  developmentDatabaseUrl,
}: TestDatabaseConfig) {
  if (!testDatabaseUrl) {
    throw new Error(
      'TEST_DATABASE_URL is required. Configure a dedicated test-only PostgreSQL database or schema before running Vitest.',
    );
  }

  let parsedTestUrl: URL;
  try {
    parsedTestUrl = new URL(testDatabaseUrl);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL connection URL.');
  }

  if (!['postgres:', 'postgresql:'].includes(parsedTestUrl.protocol)) {
    throw new Error('TEST_DATABASE_URL must use the postgres or postgresql protocol.');
  }

  const { databaseName, schemaName } = databaseIdentity(parsedTestUrl);
  if (!databaseName) {
    throw new Error('TEST_DATABASE_URL must name a dedicated test database.');
  }

  const targetLabel = `${databaseName}_${schemaName}`;
  if (!TEST_MARKER.test(databaseName) && !TEST_MARKER.test(schemaName)) {
    throw new Error(
      'TEST_DATABASE_URL is not clearly test-only: the database name or schema must contain a distinct "test" marker.',
    );
  }

  if (UNSAFE_MARKER.test(targetLabel)) {
    throw new Error(
      'TEST_DATABASE_URL must not target a database or schema marked as development, production, or live.',
    );
  }

  if (developmentDatabaseUrl) {
    let parsedDevelopmentUrl: URL;
    try {
      parsedDevelopmentUrl = new URL(developmentDatabaseUrl);
    } catch {
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
    }

    if (
      normalizedDatabaseTarget(parsedTestUrl) ===
      normalizedDatabaseTarget(parsedDevelopmentUrl)
    ) {
      throw new Error(
        'TEST_DATABASE_URL must not target the same database and schema as DATABASE_URL.',
      );
    }
  }

  return testDatabaseUrl;
}
