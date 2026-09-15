import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base, testDir: './e2e', globalSetup: './e2e/lab-03/setup.ts' });
