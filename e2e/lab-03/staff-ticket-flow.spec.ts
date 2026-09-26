import { expect, Page, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { e2ePassword, requesterA, expectNoHorizontalOverflow } from '../lab-02/helpers';
const origin = () => `http://127.0.0.1:${process.env.E2E_CLIENT_PORT ?? '3100'}`;
async function login(page: Page, email: string, destination: string) {
  await page.context().clearCookies(); await page.goto(destination);
  await page.getByLabel('Email address').fill(email); await page.getByLabel('Password', { exact: true }).fill(e2ePassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
test('E2E-02 staff workflow, public/private conversation, indication, Admin restriction and reopening', async ({ page }) => {
  await login(page, requesterA.email, '/tickets');
  const api = page.context().request;
  const token = (await (await api.get('/api/auth/csrf')).json()).csrfToken;
  const categories = await (await api.get('/api/categories')).json(), systems = await (await api.get('/api/related-systems')).json();
  const create = await api.post('/api/tickets', { headers: { Origin: origin(), 'X-CSRF-Token': token, 'Idempotency-Key': crypto.randomUUID() }, data: { categoryId: categories[0].id, relatedSystemId: systems[0].id, summary: '[E2E-STAFF] Office printer needs support', requestedPriority: 'MEDIUM', description: 'The office printer loses its connection during larger print jobs.' } });
  expect(create.status()).toBe(201); const ticket = (await create.json()).data;
  const upload = await api.post(`/api/tickets/${ticket.id}/attachments`, { headers: { Origin: origin(), 'X-CSRF-Token': token }, multipart: { file: { name: 'printer-report.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nSynthetic printer evidence') } } });
  expect(upload.status()).toBe(201);
  await login(page, 'e2e.staff@example.test', `/staff/tickets/${ticket.id}`);
  await expect(page.getByRole('heading', { name: ticket.summary })).toBeVisible();
  await page.getByRole('button', { name: 'Claim ticket', exact: true }).click(); await expect(page.getByText('Ticket updated.', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'IT Priority', exact: true }).selectOption('HIGH'); await page.getByRole('button', { name: 'Save priority' }).click();
  await expect(page.getByRole('button', { name: 'Save priority' })).toBeDisabled();
  for (const state of ['OPEN', 'IN_PROGRESS']) {
    await page.getByLabel('Next status').selectOption(state); await page.getByRole('button', { name: 'Update status' }).click(); await expect(page.getByLabel('Next status')).toHaveValue('');
  }
  await page.getByLabel('Public comment', { exact: true }).fill('We are checking the printer connection.'); await page.getByRole('button', { name: 'Post public comment' }).click(); await expect(page.getByText('We are checking the printer connection.', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Internal Notes/ }).click(); await page.getByLabel('Internal note', { exact: true }).fill('Private diagnostic: inspect the switch port.'); await page.getByRole('button', { name: 'Add internal note' }).click(); await expect(page.getByText('Private diagnostic: inspect the switch port.', { exact: true })).toBeVisible();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download', exact: true }).click(); expect((await download).suggestedFilename()).toBe('printer-report.pdf');
  await login(page, requesterA.email, `/tickets/${ticket.id}`);
  await expect(page.getByText('We are checking the printer connection.', { exact: true })).toBeVisible(); await expect(page.getByText(/Private diagnostic/)).toHaveCount(0); await expect(page.getByRole('tab', { name: /Internal/ })).toHaveCount(0);
  expect((await page.context().request.get(`/api/tickets/${ticket.id}/internal-notes`)).status()).toBe(403);
  await page.getByRole('button', { name: 'Problem appears resolved' }).click(); await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.getByText(/You reported this problem appears resolved/)).toBeVisible();
  await login(page, 'e2e.admin@example.test', `/staff/tickets/${ticket.id}`);
  await expect(page.getByRole('heading', { name: 'Ticket oversight' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Claim ticket' })).toHaveCount(0); await expect(page.getByLabel('Next status')).toHaveCount(0); await expect(page.getByRole('textbox')).toHaveCount(0);
  await page.getByRole('tab', { name: /Internal Notes/ }).click(); await expect(page.getByText('Private diagnostic: inspect the switch port.', { exact: true })).toBeVisible();
  await login(page, 'e2e.staff@example.test', `/staff/tickets/${ticket.id}`);
  for (const state of ['RESOLVED', 'CLOSED', 'REOPENED']) {
    await page.getByLabel('Next status').selectOption(state); await page.getByRole('button', { name: 'Update status' }).click(); await expect(page.getByRole('dialog')).toContainText(ticket.ticketNumber); await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.getByLabel('Next status')).toHaveValue('');
  }
  await expect(page.getByText(/requester reported this problem appears resolved/)).toHaveCount(0);
});

test('RESP/VIS staff queue and private detail remain usable at desktop, tablet, mobile and 320px', async ({ page }) => {
  await mkdir('test-results/lab-03/staff-workflow', { recursive: true });
  await login(page, 'e2e.staff@example.test', '/staff/tickets');
  for (const [width, height] of [[1440, 900], [834, 1112], [390, 844], [320, 900]]) {
    await page.setViewportSize({ width, height }); await page.goto('/staff/tickets');
    await expect(page.getByText(/matching tickets$/)).toBeVisible();
    if (width < 768) await page.getByRole('button', { name: 'Filters & sort' }).click();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/lab-03/staff-workflow/${width}-queue.png`, fullPage: true });
    const link = width >= 992 ? page.locator('.wf-table tbody a').first() : page.getByRole('link', { name: /Open ticket/ }).first(); await link.click();
    await expect(page.getByRole('heading', { name: 'Ticket information' })).toBeVisible(); await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/lab-03/staff-workflow/${width}-detail.png`, fullPage: true });
    await page.getByRole('tab', { name: /Internal Notes/ }).click(); await expect(page.getByText(/Internal — visible only/)).toBeVisible(); await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/lab-03/staff-workflow/${width}-internal-notes.png`, fullPage: true });
  }
});
