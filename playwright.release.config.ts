import { defineConfig } from '@playwright/test';
import base from './playwright.staff.config';

// All Lab 2-4 browser specs, including retained authentication and responsive cases.
export default defineConfig({
  ...base,
  webServer: (Array.isArray(base.webServer) ? base.webServer : [base.webServer!]).map(server => ({ ...server, timeout: 120_000 })),
});
