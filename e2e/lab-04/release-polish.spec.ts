import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { createTicket, expectNoHorizontalOverflow, requesterA } from '../lab-02/helpers';
import { loginAs } from './helpers';

test('RELEASE real role routes have no browser errors, broken API reads or hidden keyboard focus', async ({ page, request }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  let authenticatedRoute = false;
  page.on('pageerror', error => errors.push(error.message));
  // The unauthenticated session probe intentionally returns 401 before login.
  page.on('console', message => { if (authenticatedRoute && message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (authenticatedRoute && response.url().includes('/api/') && response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  const ticket = await createTicket(request, '[E2E-L4-RELEASE] Integrated polish and accessible routes');
  for (const [email, routes] of [
    [requesterA.email, ['/dashboard', '/tickets', '/tickets/new', `/tickets/${ticket.id}`]],
    ['e2e.staff@example.test', ['/staff/dashboard', '/staff/tickets', `/staff/tickets/${ticket.id}`]],
    ['e2e.admin@example.test', ['/admin/users', '/staff/dashboard', `/staff/tickets/${ticket.id}`]],
  ] as const) {
    authenticatedRoute = false;
    await loginAs(page, email, routes[0]);
    authenticatedRoute = true;
    for (const route of routes) {
      await page.goto(route);
      await expect(page.getByRole('button', { name: 'Logout', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(/^Loading\b/i)).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await page.keyboard.press('Tab');
      const focus = page.locator(':focus');
      await expect(focus).toBeVisible();
      const outline = await focus.evaluate(element => {
        const style = getComputedStyle(element);
        return { width: parseFloat(style.outlineWidth), style: style.outlineStyle, shadow: style.boxShadow };
      });
      expect(outline.width > 0 && outline.style !== 'none' || outline.shadow !== 'none').toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test('RELEASE Action create, validation and edit forms retain accessible data at three widths', async ({ page, request }) => {
  test.setTimeout(90_000);
  const ticket = await createTicket(request, '[E2E-L4-RELEASE] Action form evidence');
  await loginAs(page, 'e2e.staff@example.test', `/staff/tickets/${ticket.id}`);
  await page.getByRole('button', { name: 'Add Action' }).click();
  await page.getByLabel('Action Description').fill('Inspect the connection and retain this draft');
  await page.getByLabel('Assigned to').selectOption({ label: 'Alex Morgan' });
  await page.getByLabel('Follow-Up Required?').check();
  await page.getByLabel('Follow-up Note').fill('Ask Requester to verify the restored connection');
  await page.getByLabel('Attachment Notes').fill('See the diagnostic file attached to this Ticket');
  const capture = async (scene: string) => {
    await mkdir('test-results/lab-04/release-forms', { recursive: true });
    for (const [width, height] of [[1440, 900], [834, 1112], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: `test-results/lab-04/release-forms/${scene}-${width}.png`, fullPage: true });
    }
  };
  await capture('action-create');
  // Native required validation keeps the form and draft in place.
  await page.getByLabel('Follow-up Note').fill('');
  await page.getByRole('button', { name: 'Save Action' }).click();
  await expect(page.getByLabel('Follow-up Note')).toBeFocused();
  expect(await page.getByLabel('Follow-up Note').evaluate((field: HTMLTextAreaElement) => field.validity.valueMissing)).toBe(true);
  await expect(page.getByLabel('Action Description')).toHaveValue('Inspect the connection and retain this draft');
  await capture('action-validation');
  await page.getByLabel('Follow-up Note').fill('Ask Requester to verify the restored connection');
  await page.getByRole('button', { name: 'Save Action' }).click();
  await expect(page.getByText('Action saved.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Result', { exact: true }).fill('Connection checked; follow-up verification remains');
  await capture('action-edit');
  await page.getByRole('button', { name: 'Save Action' }).click();
  await expect(page.getByText('Action saved.', { exact: true })).toBeVisible();
  const actions = await (await page.request.get(`/api/tickets/${ticket.id}/actions`)).json();
  expect(actions.data).toHaveLength(1);
  const detail = await (await page.request.get(`/api/tickets/${ticket.id}/actions/${actions.data[0].id}`)).json();
  expect(detail.revisions.map((entry: { operation: string }) => entry.operation)).toEqual(['CREATED', 'EDITED']);
});
