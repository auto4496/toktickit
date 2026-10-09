import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testDir: './e2e/lab-04',
  testMatch: ['**/actions-taken-flow.spec.ts', '**/action-start.spec.ts', '**/action-create-recovery.spec.ts'],
  globalSetup: './e2e/lab-03/setup.ts',
});
