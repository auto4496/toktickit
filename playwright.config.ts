import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@playwright/test';
import { requireTestDatabaseUrl } from './server/tests/test-database.js';

const readLocalTestUrl = () => {
  const file = path.resolve('.env.test.local');
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((entry) => /^\s*TEST_DATABASE_URL\s*=/.test(entry));
  if (!line) return undefined;
  const value = line.slice(line.indexOf('=') + 1).trim();
  return value.replace(/^("|')(.*)\1$/, '$2');
};

const testDatabaseUrl = requireTestDatabaseUrl({
  testDatabaseUrl: process.env.TEST_DATABASE_URL ?? readLocalTestUrl(),
  developmentDatabaseUrl: process.env.DATABASE_URL,
});

process.env.TEST_DATABASE_URL = testDatabaseUrl;

const apiPort = '5100';
const clientPort = '3100';
const apiUrl = `http://127.0.0.1:${apiPort}`;
const clientUrl = `http://127.0.0.1:${clientPort}`;

export default defineConfig({
  testDir: './e2e/lab-02',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/lab-02/global-setup.ts',
  globalTeardown: './e2e/lab-02/global-teardown.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: clientUrl,
    browserName: 'chromium',
    colorScheme: 'light',
    locale: 'en-US',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev:server',
      url: `${apiUrl}/api/health`,
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: testDatabaseUrl,
        TEST_DATABASE_URL: testDatabaseUrl,
        PORT: apiPort,
        ATTACHMENT_STORAGE_DIR: path.resolve('tmp', 'attachments', 'e2e'),
      },
    },
    {
      command: `npm --prefix client run dev -- --host 127.0.0.1 --port ${clientPort}`,
      url: clientUrl,
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        VITE_API_URL: apiUrl,
      },
    },
  ],
});
