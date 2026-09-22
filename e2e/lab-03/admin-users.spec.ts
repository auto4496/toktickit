import { expect, Page, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { e2ePassword, expectNoHorizontalOverflow } from '../lab-02/helpers';
async function login(page: Page, email = 'e2e.admin@example.test', password = e2ePassword) {
  await page.context().clearCookies(); await page.goto('/admin/users');
  await page.getByLabel('Email address').fill(email); await page.getByLabel('Password', { exact: true }).fill(password); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
test('E2E-03 Admin creates, edits and resets an account; new credentials require password change', async ({ page }) => {
  await login(page); await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  const email = `e2e.admin-created-${Date.now()}@example.test`, name = 'Jordan Green';
  await page.getByRole('button', { name: /Create user/ }).click(); await page.getByLabel('Name', { exact: true }).fill(name); await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Role', { exact: true }).selectOption('IT_STAFF');
  for (const label of ['Initial password', 'Confirm initial password']) await page.getByLabel(label, { exact: true }).fill(e2ePassword);
  await page.getByRole('button', { name: 'Create account' }).click(); await expect(page.getByRole('status').filter({ hasText: 'Account saved successfully.' })).toBeVisible();
  await page.getByLabel('Search users').fill(email); await page.getByRole('button', { name: 'Search', exact: true }).click(); await expect(page.getByText('1 account matching your search')).toBeVisible();
  await page.getByRole('button', { name: `Edit ${name}` }).click(); await page.getByLabel('Name', { exact: true }).fill('Jordan Green Updated'); await page.getByRole('button', { name: 'Save changes' }).click(); await expect(page.getByRole('button', { name: 'Edit Jordan Green Updated' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Jordan Green Updated' }).click(); await page.getByRole('button', { name: 'Set new initial password' }).click(); await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Set new initial password' })).toBeFocused();
  await page.getByRole('button', { name: 'Set new initial password' }).click(); const replacement = 'Replacement green garden password 2026';
  for (const label of ['Initial password', 'Confirm initial password']) await page.getByLabel(label, { exact: true }).fill(replacement);
  await page.getByRole('button', { name: 'Set initial password', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Initial password updated.' })).toBeVisible();
  await login(page, email, replacement); await expect(page.getByRole('heading', { name: 'Choose your new password' })).toBeVisible();
  expect((await page.context().request.get(`http://127.0.0.1:${process.env.E2E_API_PORT ?? '5100'}/api/admin/users`)).status()).toBe(403);
  await page.getByLabel('Current password', { exact: true }).fill(replacement); await page.getByLabel('New password', { exact: true }).fill('Chosen personal green garden password 2026'); await page.getByLabel('Confirm new password', { exact: true }).fill('Chosen personal green garden password 2026'); await page.getByRole('button', { name: 'Save password and continue', exact: true }).click(); await expect(page).toHaveURL(/\/staff\/tickets$/);
  expect((await page.context().request.get(`http://127.0.0.1:${process.env.E2E_API_PORT ?? '5100'}/api/admin/users`)).status()).toBe(403);
});
test('RESP/VIS administrator directory, editor and reset dialog at four widths', async ({ page }) => {
  await mkdir('test-results/lab-03/user-management', { recursive: true }); await login(page); await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  for (const [width, height] of [[1440, 900], [834, 1112], [390, 844], [320, 900]]) {
    await page.setViewportSize({ width, height }); await page.goto('/admin/users'); await expect(page.getByRole('button', { name: 'Edit Taylor Admin' })).toBeVisible(); await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/lab-03/user-management/users-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Edit Taylor Admin' }).click(); await expect(page.getByRole('switch')).toBeDisabled(); await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/lab-03/user-management/editor-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Set new initial password' }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/lab-03/user-management/reset-${width}.png`, fullPage: true }); await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
});

test('Admin dirty edits survive cancelled shell navigation and browser Back', async ({ page }) => {
  await login(page); await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ticket Lookup' }).click();
  await page.getByRole('link', { name: 'Users', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Taylor Admin' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Unsaved administrator draft');
  await page.getByRole('link', { name: 'Ticket Lookup' }).click();
  const dialog = page.getByRole('dialog', { name: 'Discard account changes?' });
  await expect(dialog).toBeVisible(); await expect(page).toHaveURL(/\/admin\/users$/);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Unsaved administrator draft');
  // Drive native history rather than an application-generated popstate event.
  await page.goBack(); await expect(dialog).toBeVisible(); await expect(page).toHaveURL(/\/admin\/users$/);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Unsaved administrator draft');
  await page.goBack(); await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page).toHaveURL(/\/staff\/tickets$/);
  await page.goForward(); await expect(page).toHaveURL(/\/admin\/users$/);
  await page.getByRole('button', { name: 'Edit Taylor Admin' }).click(); await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Taylor Admin');
});
