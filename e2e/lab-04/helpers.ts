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
