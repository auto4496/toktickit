import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { requireTestDatabaseUrl } from './server/tests/test-database.js';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');
  const testDatabaseUrl = requireTestDatabaseUrl({
    testDatabaseUrl: process.env.TEST_DATABASE_URL ?? environment.TEST_DATABASE_URL,
    developmentDatabaseUrl: process.env.DATABASE_URL ?? environment.DATABASE_URL,
  });

  return {
    resolve: {
      // App.tsx is inside client/, which has its own node_modules. Force the UI
      // tests and ReactDOM to share the root React instance used by Vitest.
      dedupe: ['react', 'react-dom'],
    },
    test: {
      globals: true,
      environment: 'node',
      env: {
        DATABASE_URL: testDatabaseUrl,
        NODE_ENV: 'test',
        TEST_DATABASE_URL: testDatabaseUrl,
      },
      include: [
        'server/tests/**/*.test.ts',
        'client/tests/**/*.test.tsx',
      ],
    },
  };
});
