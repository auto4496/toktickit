import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { e2ePassword, expectNoHorizontalOverflow } from './helpers.js';

test('AUTH-E2E initial-password gate, change, role landing and logout on a real browser', async ({ page }) => {
  await mkdir('test-results/lab-03/screenshots', { recursive: true });
  await page.goto('/tickets/new');
  await expect(page.getByRole('heading', { name: 'Sign in to TokTickIT' })).toBeVisible();
  await page.getByLabel('Email address').fill('e2e.initial@example.test');
  await page.getByLabel('Password', { exact: true }).fill(e2ePassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose your new password' })).toBeVisible();
  await page.goto('/tickets/new');
  await expect(page.getByRole('heading', { name: 'Choose your new password' })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  for (const width of [1440, 834, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/lab-03/screenshots/change-password-${width}.png`, fullPage: true });
  }
  await page.getByLabel('Current password', { exact: true }).fill(e2ePassword);
  await page.getByLabel('New password', { exact: true }).fill('Changed e2e garden passphrase 2026');
  await page.getByLabel('Confirm new password', { exact: true }).fill('Changed e2e garden passphrase 2026');
  await page.getByRole('button', { name: 'Save password and continue' }).click();
  await expect(page).toHaveURL(/\/staff\/tickets$/);
  await expect(page.getByText('Initial Staff E2E')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to TokTickIT' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in to TokTickIT' })).toBeVisible();
  await page.screenshot({ path: 'test-results/lab-03/screenshots/login-320.png', fullPage: true });
});
