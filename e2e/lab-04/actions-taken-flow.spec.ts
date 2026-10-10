import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { createTicket, expectNoHorizontalOverflow, requesterA } from '../lab-02/helpers';
import { loginAs } from './helpers';

test('E2E-L4-01 different staff and Admin record Actions visible read-only to Requester', async ({ page, request }) => {
  const ticket = await createTicket(request, `[E2E-L4-ACTIONS] Multiple actors ${Date.now()}`);
  await loginAs(page, 'e2e.staff@example.test', `/staff/tickets/${ticket.id}`);
  await expect(page.getByRole('heading', { name: 'Actions Taken' })).toBeVisible();
  await page.getByRole('button', { name: 'Add Action' }).click();
  await page.getByLabel('Action Description').fill('Investigated the failing client');
  await page.getByLabel('Result', { exact: true }).fill('Reproduced the issue');
  await page.getByLabel('Assigned to').selectOption({ label: 'Alex Morgan' });
  await page.getByRole('button', { name: 'Save Action' }).click();
  await expect(page.getByRole('button', { name: 'Complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Complete' }).click();
  await expect(page.getByText('Action completed.')).toBeVisible();

  await loginAs(page, 'e2e.staff2@example.test', `/staff/tickets/${ticket.id}`);
  await page.getByRole('button', { name: 'Add Action' }).click();
  await page.getByLabel('Action Description').fill('Verified the client settings with another staff member');
  await page.getByLabel('Result', { exact: true }).fill('Confirmed the connection settings');
  await page.getByLabel('Assigned to').selectOption({ label: 'Alex Morgan' });
  await page.getByRole('button', { name: 'Save Action' }).click();
  await expect(page.getByText('Action saved.')).toBeVisible();
  const shared = await (await page.request.get(`/api/tickets/${ticket.id}/actions`)).json();
  expect(shared.data.map((action: { performedBy: { name: string } }) => action.performedBy.name)).toEqual(expect.arrayContaining(['Alex Morgan', 'Jamie Support']));

  await loginAs(page, 'e2e.admin@example.test', `/staff/tickets/${ticket.id}`);
  await page.getByRole('button', { name: 'Add Action' }).click();
  await page.getByLabel('Action Description').fill('Reviewed the documented result');
  await page.getByLabel('Assigned to').selectOption({ label: 'Alex Morgan' });
  await page.getByRole('button', { name: 'Save Action' }).click();
  await expect(page.getByText('Action saved.')).toBeVisible();
  await page.getByRole('button', { name: /All Actions/ }).click();
  await mkdir('test-results/lab-04/actions-taken', { recursive: true });
  for (const width of [1440, 834, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/lab-04/actions-taken/staff-${width}.png`, fullPage: true });
  }

  await loginAs(page, requesterA.email, `/tickets/${ticket.id}`);
  await expect(page.getByText('Investigated the failing client')).toBeVisible();
  await expect(page.getByText('Reviewed the documented result')).toBeVisible();
  await expect(page.getByText('Verified the client settings with another staff member')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Action' })).toHaveCount(0);
  for (const width of [1440, 834, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/lab-04/actions-taken/requester-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'View Action' }).first().click();
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
});
