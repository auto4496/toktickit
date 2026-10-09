import { defineConfig } from '@playwright/test';
import base from './playwright.actions.config';

export default defineConfig({
  ...base,
  testMatch: '**/dashboards.spec.ts',
  // Cold starts through linked Windows dependencies can exceed the base limit.
  // Keep real server readiness checks and the normal per-test timeout.
  webServer: (Array.isArray(base.webServer) ? base.webServer : [base.webServer!]).map(server => ({ ...server, timeout: 120_000 })),
});
