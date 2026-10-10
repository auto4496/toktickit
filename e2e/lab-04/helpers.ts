import { expect, type Page } from '@playwright/test';
import { e2ePassword } from '../lab-02/helpers';

export async function loginAs(page: Page, email: string, destination: string) {
  await page.context().clearCookies();
  await page.goto(destination);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(e2ePassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Logout', exact: true })).toBeVisible();
}

export async function completeResolutionAction(page: Page) {
  await page.getByRole('button', { name: 'Add Action' }).click();
  await page.getByLabel('Action Description').fill('Applied and verified the service fix');
  await page.getByLabel('Result', { exact: true }).fill('Requester service is restored');
  await page.getByLabel('Assigned to').selectOption({ label: 'Alex Morgan' });
  await page.getByRole('button', { name: 'Save Action' }).click();
  await expect(page.getByText('Action saved.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Complete', exact: true }).click();
  await expect(page.getByText('Action completed.', { exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Resolved', exact: true })).toHaveJSProperty('disabled', false);
}
