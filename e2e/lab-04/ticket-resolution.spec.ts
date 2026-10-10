import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { expect, request as browserRequest, test, type Page } from '@playwright/test';
import { createTicket, e2ePassword, expectNoHorizontalOverflow, requesterA } from '../lab-02/helpers';
import { completeResolutionAction, loginAs } from './helpers';

const origin = `http://127.0.0.1:${process.env.E2E_CLIENT_PORT ?? '3100'}`;
async function progress(page: Page) {
  await page.getByRole('button', { name: 'Claim ticket' }).click();
  for (const status of ['OPEN', 'IN_PROGRESS']) {
    await page.getByLabel('Next status').selectOption(status);
    await page.getByRole('button', { name: 'Update status' }).click();
    await expect(page.getByLabel('Next status')).toHaveValue('');
  }
}
async function status(page: Page, value: string) {
  await page.getByLabel('Next status').selectOption(value);
  await page.getByRole('button', { name: 'Update status' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByLabel('Next status')).toHaveValue('');
}
async function capture(page: Page, scene: string) {
  const root = 'test-results/lab-04/workflow';
  await mkdir(root, { recursive: true });
  for (const [width, height] of [[1440, 900], [834, 1112], [390, 844]]) {
    await page.setViewportSize({ width, height }); await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${root}/${scene}-${width}.png`, fullPage: true });
  }
}

test('E2E-02 indication is advisory; gate refresh enables resolution then close/reopen preserves Actions', async ({ page, request }) => {
  const ticket = await createTicket(request, `[E2E-L4-RESOLUTION] ${randomUUID()}`);
  await loginAs(page, 'e2e.staff@example.test', `/staff/tickets/${ticket.id}`); await progress(page);
  await expect(page.getByRole('option', { name: 'Resolved', exact: true })).toHaveJSProperty('disabled', true);
  await capture(page, 'resolution-blocked');
  await loginAs(page, requesterA.email, `/tickets/${ticket.id}`);
  await page.getByRole('button', { name: 'Problem appears resolved' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByText(/You reported this problem appears resolved/)).toBeVisible();
  expect((await (await page.request.get(`/api/tickets/${ticket.id}`)).json()).data.currentStatus).toBe('IN_PROGRESS');
  await loginAs(page, 'e2e.admin@example.test', `/staff/tickets/${ticket.id}`);
  await expect(page.getByLabel('Next status')).toHaveCount(0);
  const csrf = (await (await page.request.get('/api/auth/csrf')).json()).csrfToken;
  expect((await page.request.patch(`/api/staff/tickets/${ticket.id}/status`, { headers: { Origin: origin, 'X-CSRF-Token': csrf }, data: { currentStatus: 'RESOLVED', expectedVersion: 1, confirmed: true } })).status()).toBe(403);
  await loginAs(page, 'e2e.staff@example.test', `/staff/tickets/${ticket.id}`);
  await expect(page.getByRole('option', { name: 'Resolved', exact: true })).toHaveJSProperty('disabled', true);
  await completeResolutionAction(page);
  await capture(page, 'resolution-ready');
  const actionsBefore = await (await page.request.get(`/api/tickets/${ticket.id}/actions`)).json();
  await status(page, 'RESOLVED'); await status(page, 'CLOSED');
  await expect(page.getByRole('button', { name: 'Add Action' })).toHaveCount(0);
  await capture(page, 'resolution-closed');
  await status(page, 'REOPENED');
  await expect(page.getByText(/requester reported this problem appears resolved/)).toHaveCount(0);
  const after = await (await page.request.get(`/api/tickets/${ticket.id}/actions`)).json();
  expect(after.data).toEqual(actionsBefore.data);
  const history = await (await page.request.get(`/api/tickets/${ticket.id}/actions/${after.data[0].id}`)).json();
  expect(history.revisions.map((row: { operation: string }) => row.operation)).toEqual(['CREATED', 'COMPLETED']);
});

test('E2E-02 server rejects stale readiness after a competing Action; explicit retry refreshes the gate', async ({ page, request }) => {
  const ticket = await createTicket(request, `[E2E-L4-GATE-CONFLICT] ${randomUUID()}`);
  await loginAs(page, 'e2e.staff@example.test', `/staff/tickets/${ticket.id}`); await progress(page); await completeResolutionAction(page);
  const competing = await browserRequest.newContext({ baseURL: origin });
  try {
    const boot = await competing.get('/api/auth/csrf');
    const login = await competing.post('/api/auth/login', { headers: { Origin: origin, 'X-CSRF-Token': (await boot.json()).csrfToken }, data: { email: 'e2e.admin@example.test', password: e2ePassword } });
    const headers = { Origin: origin, 'X-CSRF-Token': (await login.json()).csrfToken };
    const actor = (await (await competing.get('/api/auth/me')).json()).user;
    const added = await competing.post(`/api/tickets/${ticket.id}/actions`, { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data: { actionAt: new Date().toISOString(), description: 'Competing unfinished follow-up', result: '', assignedToId: actor.id, followUpRequired: true, followUpNote: 'Verify new symptom', attachmentNotes: '' } });
    expect(added.status()).toBe(201); const action = (await added.json()).data;
    await page.getByLabel('Next status').selectOption('RESOLVED'); await page.getByRole('button', { name: 'Update status' }).click();
    const confirm = page.getByRole('dialog');
    await expect(confirm.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(confirm.getByRole('button', { name: 'Confirm', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByText(/Resolve requires at least one completed Action/)).toBeFocused();
    await expect(page.getByLabel('Next status')).toHaveValue('RESOLVED');
    await expect(page.getByRole('button', { name: 'Update status' })).toBeDisabled();
    await capture(page, 'resolution-gate-rejected');
    expect((await competing.patch(`/api/tickets/${ticket.id}/actions/${action.id}/status`, { headers, data: { status: 'CANCELLED', expectedVersion: 1 } })).status()).toBe(200);
    await page.getByRole('button', { name: 'Retry readiness' }).click();
    await expect(page.getByRole('button', { name: 'Update status' })).toBeEnabled();
    await page.getByRole('button', { name: 'Update status' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.locator('.wf-heading .wf-badge')).toHaveText('Resolved');
  } finally { await competing.dispose(); }
});
