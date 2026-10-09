import { defineConfig } from '@playwright/test';
import base from './playwright.actions.config';

export default defineConfig({ ...base, testMatch: '**/ticket-resolution.spec.ts' });
