import { describe, expect, it } from 'vitest';
import { requireTestDatabaseUrl } from '../test-database.js';

describe('test database guard', () => {
  it('accepts a dedicated test database', () => {
    const testDatabaseUrl =
      'postgresql://postgres:secret@localhost:5432/toktickit_test?schema=public';

    expect(
      requireTestDatabaseUrl({
        testDatabaseUrl,
        developmentDatabaseUrl:
          'postgresql://postgres:secret@localhost:5432/toktickit?schema=public',
      }),
    ).toBe(testDatabaseUrl);
  });

  it('accepts a dedicated test schema', () => {
    const testDatabaseUrl =
      'postgresql://postgres:secret@localhost:5432/toktickit?schema=lab2_test';

    expect(
      requireTestDatabaseUrl({
        testDatabaseUrl,
        developmentDatabaseUrl:
          'postgresql://postgres:secret@localhost:5432/toktickit?schema=public',
      }),
    ).toBe(testDatabaseUrl);
  });

  it.each([
    [undefined, 'TEST_DATABASE_URL is required'],
    [
      'postgresql://postgres:secret@localhost:5432/toktickit?schema=public',
      'not clearly test-only',
    ],
    [
      'postgresql://postgres:secret@localhost:5432/toktickit_prod_test?schema=public',
      'must not target a database or schema marked as development, production, or live',
    ],
  ])('rejects an unsafe test target', (testDatabaseUrl, expectedMessage) => {
    expect(() => requireTestDatabaseUrl({ testDatabaseUrl })).toThrow(expectedMessage);
  });

  it('rejects the development database even when its name contains test', () => {
    const testDatabaseUrl =
      'postgresql://postgres:secret@localhost:5432/toktickit_test?schema=public';

    expect(() =>
      requireTestDatabaseUrl({
        testDatabaseUrl,
        developmentDatabaseUrl:
          'postgres://another-user:another-secret@LOCALHOST/toktickit_test?schema=public',
      }),
    ).toThrow('must not target the same database and schema as DATABASE_URL');
  });
});
