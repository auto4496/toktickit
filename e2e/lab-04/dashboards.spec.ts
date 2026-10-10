import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { e2ePassword, expectNoHorizontalOverflow } from '../lab-02/helpers';
import { hashPassword } from '../../server/src/auth/password';
import { requireTestDatabaseUrl } from '../../server/tests/test-database';
import { loginAs } from './helpers';

// Normal setup generates the server client; the root package may be ungenerated.
const serverRequire = createRequire(path.resolve('server/package.json'));
const { PrismaClient } = serverRequire('@prisma/client') as typeof import('@prisma/client');

const requesterId = randomUUID(), staffId = randomUUID(), adminId = randomUUID(), emptyId = randomUUID();
const requesterEmail = `${requesterId}@example.test`, staffEmail = `${staffId}@example.test`, adminEmail = `${adminId}@example.test`, emptyEmail = `${emptyId}@example.test`;
const tickets: string[] = [];
test.beforeAll(async () => {
  const db = new PrismaClient({ datasources: { db: { url: requireTestDatabaseUrl({ testDatabaseUrl: process.env.TEST_DATABASE_URL, developmentDatabaseUrl: process.env.DATABASE_URL }) } } });
  try {
    const passwordHash = await hashPassword(e2ePassword);
    for (const [id, name, role] of [[requesterId, 'Dashboard Requester', 'REQUESTER'], [staffId, 'Dashboard Support', 'IT_STAFF'], [adminId, 'Dashboard Admin', 'ADMINISTRATOR'], [emptyId, 'Empty Dashboard Requester', 'REQUESTER']] as const) {
      await db.user.create({ data: { id, name, role, email: `${id}@example.test`, passwordHash, mustChangePassword: false } });
    }
    const category = await db.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await db.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const statuses = ['NEW', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'CANCELLED', 'IN_PROGRESS', 'OPEN'] as const;
    for (let i = 0; i < statuses.length; i++) tickets.push((await db.ticket.create({ data: {
      ticketNumber: `E2E-DASH-${randomUUID()}`, summary: `[E2E-L4-DASH] ${i} Service desk follow-up and connection troubleshooting with a long readable summary`, description: 'Synthetic dashboard evidence',
      requesterId, categoryId: category.id, relatedSystemId: system.id, requestedPriority: 'MEDIUM', itPriority: i % 2 ? 'HIGH' : 'LOW', currentStatus: statuses[i], ownerId: i % 2 ? staffId : null,
    } })).id);
    for (const [index, actor] of [[1, staffId], [1, staffId], [6, adminId]] as const) await db.actionTaken.create({ data: { ticketId: tickets[index], assignedToId: actor, createdById: actor, performedById: actor, actionAt: new Date(), description: 'Follow up on diagnostics', followUpRequired: true, followUpNote: 'Request logs' } });
  } finally { await db.$disconnect(); }
});
test.afterAll(async () => {
  const db = new PrismaClient({ datasources: { db: { url: requireTestDatabaseUrl({ testDatabaseUrl: process.env.TEST_DATABASE_URL, developmentDatabaseUrl: process.env.DATABASE_URL }) } } });
  try {
    if (tickets.length) {
      await db.actionTaken.deleteMany({ where: { ticketId: { in: tickets } } });
      await db.ticket.deleteMany({ where: { id: { in: tickets } } });
    }
    const users = [requesterId, staffId, adminId, emptyId];
    await db.authSession.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
  } finally { await db.$disconnect(); }
});
async function capture(page: Page, scene: string) {
  await mkdir('test-results/lab-04/dashboards', { recursive: true });
  for (const [width, height] of [[1440, 900], [834, 1112], [390, 844]]) {
    await page.setViewportSize({ width, height }); await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/lab-04/dashboards/${scene}-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
async function clickAndQuery(page: Page, name: RegExp, endpoint: string, expected: Record<string, string>) {
  const link = page.getByRole('link', { name });
  // Activate the native link with the keyboard and observe the real API query.
  await link.focus(); await expect(link).toBeFocused();
  const response = page.waitForResponse(result => result.url().includes(endpoint + '?') && Object.entries(expected).every(([key, value]) => new URL(result.url()).searchParams.get(key) === value));
  await page.keyboard.press('Enter');
  const result = await response; expect(result.status()).toBe(200); return result.json();
}
test('E2E-03 Requester Dashboard metrics, filtered lists, history, detail and responsive keyboard links', async ({ page }) => {
  await loginAs(page, requesterEmail, '/dashboard');
  await expect(page.getByRole('heading', { name: 'Requester Dashboard' })).toBeVisible();
  const dashboard = await (await page.request.get('/api/dashboard/requester')).json();
  expect(dashboard.metrics.open).toBe(4);
  await expect(page.getByRole('link', { name: /Open tickets/ })).toContainText(String(dashboard.metrics.open));
  await capture(page, 'requester');
  const open = await clickAndQuery(page, /Open tickets/, '/api/tickets', { status: 'open' });
  expect(open.meta.totalItems).toBe(dashboard.metrics.open); expect(open.data.map((row: { id: string }) => row.id).sort()).toEqual([0, 1, 5, 6].map(i => tickets[i]).sort());
  await expect(page.getByLabel('Ticket scope')).toHaveValue('open');
  await page.goBack(); await expect(page.getByRole('heading', { name: 'Requester Dashboard' })).toBeVisible();
  await page.goForward(); await expect(page.getByLabel('Ticket scope')).toHaveValue('open');
  await page.getByRole('link', { name: 'My Tickets', exact: true }).click(); await expect(page.getByLabel('Ticket scope')).toHaveValue('');
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  const waiting = await clickAndQuery(page, /Waiting for you/, '/api/tickets', { currentStatus: 'WAITING_FOR_REQUESTER' });
  expect(waiting.meta.totalItems).toBe(1); expect(waiting.data[0].id).toBe(tickets[1]);
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  const recent = page.locator('.lab4-recent a').first(); const href = await recent.getAttribute('href'); await recent.click();
  await expect(page).toHaveURL(new RegExp(href! + '$')); await expect(page.getByRole('heading', { name: /Service desk follow-up/ })).toBeVisible();
  await page.goto('/staff/dashboard'); await expect(page.getByRole('heading', { name: 'Access unavailable' })).toBeVisible();
});
test('E2E-03 Staff counts and distinct follow-up drill-down preserve intersecting filters', async ({ page }) => {
  await loginAs(page, staffEmail, '/staff/dashboard');
  await expect(page.getByRole('link', { name: /Your follow-up Actions/ })).toBeVisible();
  const dashboard = await (await page.request.get('/api/dashboard/staff')).json(); expect(dashboard.metrics.myFollowUps).toBe(2);
  await capture(page, 'staff');
  const unassigned = await clickAndQuery(page, /Unassigned tickets/, '/api/staff/tickets', { owner: 'unassigned', status: 'open' }); expect(unassigned.meta.totalItems).toBe(dashboard.metrics.unassigned);
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  const owned = await clickAndQuery(page, /Owned by you/, '/api/staff/tickets', { owner: 'me', status: 'open' }); expect(owned.meta.totalItems).toBe(dashboard.metrics.myOwned);
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  const follow = await clickAndQuery(page, /Your follow-up Actions/, '/api/staff/tickets', { actionAssignee: 'me' }); expect(follow.meta.totalItems).toBe(1); expect(follow.data[0].id).toBe(tickets[1]);
  await expect(page.getByText(/Each ticket appears once/)).toBeVisible();
  await page.getByRole('combobox', { name: /^Status/ }).selectOption('CLOSED'); await page.getByRole('button', { name: 'Apply filters' }).click(); await expect(page.getByRole('heading', { name: 'No matching tickets' })).toBeVisible();
  await page.locator('form').getByRole('button', { name: 'Clear filters' }).click(); await expect(page.getByLabel('Follow-up Actions')).toHaveValue('');
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  const high = await clickAndQuery(page, /^High/, '/api/staff/tickets', { itPriority: 'HIGH' }); expect(high.meta.totalItems).toBe(dashboard.metrics.byPriority.HIGH);
});
test('E2E-03 Admin Dashboard retains Users and scopes follow-ups to the current Admin', async ({ page }) => {
  await loginAs(page, adminEmail, '/staff/dashboard');
  await expect(page.getByRole('link', { name: 'Users', exact: true })).toBeVisible(); await expect(page.getByRole('link', { name: /Your follow-up Actions/ })).toBeVisible();
  await capture(page, 'admin');
  const follow = await clickAndQuery(page, /Your follow-up Actions/, '/api/staff/tickets', { actionAssignee: 'me' }); expect(follow.data.map((row: { id: string }) => row.id)).toEqual([tickets[6]]);
  await page.getByRole('link', { name: 'Users', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
});
test('E2E-03 Dashboard loading, safe failure, retry, zero and forbidden states', async ({ page }) => {
  await loginAs(page, requesterEmail, '/dashboard'); await expect(page.getByRole('link', { name: /Open tickets/ })).toBeVisible();
  let finish!: () => void; const delayed = new Promise<void>(resolve => { finish = resolve; });
  await page.route('**/api/dashboard/requester', async route => { await delayed; await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'DASHBOARD_UNAVAILABLE', message: 'Synthetic private error' } }) }); });
  await page.reload(); await expect(page.getByRole('status', { name: '' }).filter({ hasText: 'Loading dashboard' })).toBeVisible();
  try { await capture(page, 'loading-simulated'); } finally { finish(); }
  await expect(page.getByRole('alert')).toContainText('Dashboard information could not be loaded'); await expect(page.getByRole('alert')).not.toContainText('Synthetic private');
  await capture(page, 'failure-simulated');
  await page.unroute('**/api/dashboard/requester'); await page.getByRole('button', { name: 'Retry', exact: true }).click(); await expect(page.getByRole('link', { name: /Open tickets/ })).toBeVisible();
  await loginAs(page, emptyEmail, '/dashboard'); await expect(page.getByRole('link', { name: /Open tickets/ })).toContainText('0'); await expect(page.getByText('No tickets were updated in the last seven days.')).toBeVisible();
  await capture(page, 'empty');
  await page.route('**/api/dashboard/requester', route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { code: 'FORBIDDEN' } }) }));
  await page.reload(); await expect(page.getByRole('alert')).toContainText('not available for your role');
  await capture(page, 'forbidden-simulated');
});
