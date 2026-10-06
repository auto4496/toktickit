import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { expect, request as browserRequest, test, type APIRequestContext, type Page } from '@playwright/test';
import { createTicket, e2ePassword, expectNoHorizontalOverflow, requesterA } from '../lab-02/helpers';
import { loginAs } from './helpers';

const origin = `http://127.0.0.1:${process.env.E2E_CLIENT_PORT ?? '3100'}`;
const screenshotDir = 'artifacts/lab-04/actions/screenshots';
async function actorSession(context: APIRequestContext, email: string) {
  const boot = await context.get('/api/auth/csrf');
  const login = await context.post('/api/auth/login', { headers: { Origin: origin, 'X-CSRF-Token': (await boot.json()).csrfToken }, data: { email, password: e2ePassword } });
  expect(login.status()).toBe(200);
  return { Origin: origin, 'X-CSRF-Token': (await login.json()).csrfToken };
}
async function createAction(page: Page, ticketId: string, email = 'e2e.staff@example.test') {
  await loginAs(page, email, `/staff/tickets/${ticketId}`);
  await page.getByRole('button', { name: 'Add Action' }).click();
  await page.getByLabel('Action Description').fill('Verify the VPN client');
  await page.getByLabel('Result', { exact: true }).fill('Client configuration checked');
  await page.getByLabel('Assigned to').selectOption({ label: 'Alex Morgan' });
  await page.getByRole('button', { name: 'Save Action' }).click();
  await expect(page.getByText('Action saved.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeEnabled();
  const actions = await (await page.request.get(`/api/tickets/${ticketId}/actions`)).json();
  return actions.data[0];
}
async function capture(page: Page, name: string) {
  await mkdir(screenshotDir, { recursive: true });
  for (const [width, height] of [[1440, 900], [834, 1112], [390, 844]]) {
    await page.setViewportSize({ width, height }); await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${screenshotDir}/${name}-${width}.png`, fullPage: true });
  }
}

for (const email of ['e2e.staff@example.test', 'e2e.admin@example.test']) {
  test(`E2E-04 ${email} starts with keyboard/busy protection; Requester remains read-only`, async ({ page, request }) => {
    const ticket = await createTicket(request, `[E2E-L4-START] ${randomUUID()}`);
    const action = await createAction(page, ticket.id, email);
    let writes = 0, release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**/api/tickets/${ticket.id}/actions/${action.id}/status`, async route => { writes++; await gate; await route.continue(); });
    const start = page.getByRole('button', { name: 'Start', exact: true });
    await start.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Starting…' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Cancel Action' })).toBeDisabled();
    await page.getByRole('button', { name: 'Starting…' }).evaluate((button: HTMLButtonElement) => button.click());
    release();
    await expect(page.getByText('Action started.', { exact: true })).toBeVisible();
    await expect(page.getByText(`Started by ${email.includes('admin') ? 'Taylor Admin' : 'Alex Morgan'}`, { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Verify the VPN client' })).toBeFocused();
    expect(writes).toBe(1);
    const detail = await (await page.request.get(`/api/tickets/${ticket.id}/actions/${action.id}`)).json();
    expect(detail.data).toMatchObject({ status: 'IN_PROGRESS', version: 2, performedBy: { name: email.includes('admin') ? 'Taylor Admin' : 'Alex Morgan' } });
    expect(detail.revisions.map((row: { operation: string }) => row.operation)).toEqual(['CREATED', 'STARTED']);
    if (email.includes('staff')) await capture(page, 'staff-started');
    await loginAs(page, requesterA.email, `/tickets/${ticket.id}`);
    await page.getByRole('button', { name: 'View Action' }).click();
    const section = page.locator('.lab4-actions');
    for (const name of ['Start', 'Edit', 'Complete', 'Cancel Action', 'Add Action']) await expect(section.getByRole('button', { name, exact: true })).toHaveCount(0);
    await expect(section.getByText('Change history')).toHaveCount(0);
    const owned = await (await page.request.get(`/api/tickets/${ticket.id}/actions/${action.id}`)).json(); expect(owned).not.toHaveProperty('revisions');
    const csrf = await (await page.request.get('/api/auth/csrf')).json();
    expect((await page.request.patch(`/api/tickets/${ticket.id}/actions/${action.id}/status`, { headers: { Origin: origin, 'X-CSRF-Token': csrf.csrfToken }, data: { status: 'COMPLETED', result: 'Override', expectedVersion: 2 } })).status()).toBe(403);
    if (email.includes('staff')) await capture(page, 'requester-read-only');
  });
}

test('E2E-04 reloads a real competing edit before retrying Start with the latest version', async ({ page, request }) => {
  const ticket = await createTicket(request, `[E2E-L4-CONFLICT] ${randomUUID()}`);
  const action = await createAction(page, ticket.id);
  const competing = await browserRequest.newContext({ baseURL: origin });
  try {
    const headers = await actorSession(competing, 'e2e.admin@example.test');
    const update = await competing.patch(`/api/tickets/${ticket.id}/actions/${action.id}`, { headers, data: {
      actionAt: action.actionAt, description: 'Reviewed by a second actor', result: action.result, assignedToId: action.assignedTo.id,
      followUpRequired: false, followUpNote: '', attachmentNotes: '', expectedVersion: 1,
    } }); expect(update.status()).toBe(200);
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await expect(page.locator('.lab4-actions').getByRole('alert')).toContainText('This Action changed');
    await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeDisabled();
    await expect(page.getByRole('heading', { name: 'Verify the VPN client' })).toBeVisible();
    await capture(page, 'start-conflict');
    await page.getByRole('button', { name: 'Reload latest' }).click();
    await expect(page.getByRole('heading', { name: 'Reviewed by a second actor' })).toBeVisible();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await expect(page.getByText('Action started.', { exact: true })).toBeVisible();
    const result = await (await page.request.get(`/api/tickets/${ticket.id}/actions/${action.id}`)).json();
    expect(result.data).toMatchObject({ version: 3, status: 'IN_PROGRESS' });
    expect(result.revisions.map((row: { operation: string }) => row.operation)).toEqual(['CREATED', 'EDITED', 'STARTED']);
  } finally { await competing.dispose(); }
});

test('E2E-04 reloads after an ambiguous network failure and keeps terminal Actions/Tickets read-only', async ({ page, request }) => {
  const ticket = await createTicket(request, `[E2E-L4-TERMINAL] ${randomUUID()}`);
  const action = await createAction(page, ticket.id);
  let writes = 0;
  await page.route(`**/api/tickets/${ticket.id}/actions/${action.id}/status`, async route => { if (++writes === 1) await route.abort('failed'); else await route.continue(); });
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Action could not be updated. Reload latest before trying again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Reload latest' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Action started.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel Action' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cancel this Action?' });
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button', { name: 'Confirm' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Cancel Action' })).toBeFocused();
  await page.getByRole('button', { name: 'Cancel Action' }).click();
  await page.getByRole('dialog', { name: 'Cancel this Action?' }).getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Action cancelled.', { exact: true })).toBeVisible();
  await expect(page.locator('.lab4-actions').getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  const csrf = await (await page.request.get('/api/auth/csrf')).json();
  const headers = { Origin: origin, 'X-CSRF-Token': csrf.csrfToken };
  expect((await page.request.patch(`/api/tickets/${ticket.id}/actions/${action.id}/status`, { headers, data: { status: 'IN_PROGRESS', expectedVersion: 3 } })).status()).toBe(409);
  const parent = await (await page.request.get(`/api/staff/tickets/${ticket.id}`)).json();
  expect((await page.request.patch(`/api/staff/tickets/${ticket.id}/status`, { headers, data: { currentStatus: 'CANCELLED', expectedVersion: parent.data.version, confirmed: true } })).status()).toBe(200);
  await page.reload(); await page.getByRole('button', { name: 'View Action' }).click();
  await expect(page.locator('.lab4-actions').getByRole('button', { name: 'Add Action' })).toHaveCount(0);
  expect((await page.request.post(`/api/tickets/${ticket.id}/actions`, { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data: { actionAt: action.actionAt, description: 'Terminal write', result: '', assignedToId: action.assignedTo.id, followUpRequired: false, followUpNote: '', attachmentNotes: '' } })).status()).toBe(409);
});
