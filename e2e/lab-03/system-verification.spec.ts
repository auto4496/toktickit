import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { createTicket, e2ePassword, expectNoHorizontalOverflow, requesterA, uploadAttachment } from '../lab-02/helpers';

async function login(page: Page, email: string, destination: string) {
  await page.context().clearCookies();
  await page.goto(destination);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(e2ePassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
for (const [name, width, height] of [['desktop', 1440, 900], ['tablet', 834, 1112], ['mobile', 390, 844], ['narrow', 320, 900]] as const) {
  test(`SYSTEM responsive authentication, recovery and role evidence: ${name}`, async ({ page, request }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height });
    const root = 'test-results/lab-03/system-states';
    await mkdir(root, { recursive: true });
    async function capture(scene: string) {
      await expectNoHorizontalOverflow(page);
      await expect(page.getByText('Loading conversation…', { exact: true })).toHaveCount(0);
      await page.screenshot({ path: `${root}/${name}-${scene}.png`, fullPage: true });
    }
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to TokTickIT' })).toBeVisible();
    await capture('login-ready');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByLabel('Email address')).toBeFocused();
    await expect(page.getByLabel('Email address')).toHaveAttribute('aria-invalid', 'true');
    await capture('login-validation');
    await page.getByLabel('Email address').fill('unknown-system@example.test');
    await page.getByLabel('Password', { exact: true }).fill('Wrong synthetic password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByLabel('Password', { exact: true }).fill('');
    await capture('login-invalid');
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/auth/login', async route => { await gate; await route.fulfill({ status: 503, json: { error: { code: 'SYNTHETIC_FAILURE', message: 'Sign in is temporarily unavailable. Try again.' } } }); });
    await page.getByLabel('Password', { exact: true }).fill(e2ePassword);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('button', { name: /Signing in/ })).toBeDisabled();
    try { await capture('login-busy-simulated'); } finally { release(); }
    await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
    await page.getByLabel('Password', { exact: true }).fill('');
    await capture('login-failure-simulated');
    await page.unroute('**/api/auth/login');

    await login(page, 'e2e.visual-initial@example.test', '/staff/tickets');
    await expect(page.getByRole('heading', { name: 'Choose your new password' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ticket Queue', exact: true })).toHaveCount(0);
    await capture('change-password');

    const ticket = await createTicket(request, `[VIS-${name}] Printer support with a long descriptive summary for responsive verification`);
    await uploadAttachment(request, ticket.id, 'synthetic-printer-diagnostic.png');
    await login(page, 'e2e.staff@example.test', '/staff/tickets');
    await expect(page.getByText(/matching tickets$/)).toBeVisible();
    await page.getByLabel('Search tickets').fill('unique-no-results-system-verification');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'No matching tickets' })).toBeVisible();
    await capture('queue-no-results');
    const queueRoute = '**/api/staff/tickets?*';
    await page.route(queueRoute, route => route.fulfill({ status: 500, json: { error: { code: 'SYSTEM_CAPTURE', message: 'Synthetic service failure. Try again.', correlationId: 'synthetic-evidence' } } }));
    await page.goto('/staff/tickets');
    await expect(page.getByRole('heading', { name: 'Unable to load tickets' })).toBeVisible();
    await capture('queue-failure-simulated');
    await page.unroute(queueRoute);
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByText(/matching tickets$/)).toBeVisible();
    await page.route(queueRoute, route => route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } } }));
    await page.goto('/staff/tickets');
    await expect(page.getByRole('heading', { name: 'No tickets yet' })).toBeVisible();
    await capture('queue-empty-simulated');
    await page.unroute(queueRoute);

    await page.goto(`/staff/tickets/${ticket.id}`);
    await expect(page.getByRole('heading', { name: 'Ticket information' })).toBeVisible();
    await page.getByLabel('Public comment', { exact: true }).fill('We are checking the printer connection.');
    await page.getByRole('button', { name: 'Post public comment' }).click();
    await expect(page.getByText('We are checking the printer connection.', { exact: true })).toBeVisible();
    await capture('staff-public');
    await page.getByRole('tab', { name: /Internal Notes/ }).click();
    await page.getByLabel('Internal note', { exact: true }).fill('Private diagnostic draft — must remain internal.');
    await capture('staff-private');
    await page.getByRole('tab', { name: /Public Comments/ }).click();
    await expect(page.getByLabel('Public comment', { exact: true })).toHaveValue('');
    // A real competing API update makes the browser's displayed version stale.
    const api = page.context().request;
    const csrf = (await (await api.get('/api/auth/csrf')).json()).csrfToken;
    const current = (await (await api.get(`/api/staff/tickets/${ticket.id}`)).json()).data;
    expect((await api.patch(`/api/staff/tickets/${ticket.id}/priority`, { headers: { Origin: `http://127.0.0.1:${process.env.E2E_CLIENT_PORT ?? '3100'}`, 'X-CSRF-Token': csrf }, data: { itPriority: 'LOW', expectedVersion: current.version } })).status()).toBe(200);
    await page.getByRole('combobox', { name: 'IT Priority', exact: true }).selectOption('MEDIUM');
    await page.getByRole('button', { name: 'Save priority' }).click();
    await expect(page.getByRole('button', { name: 'Reload latest details' })).toBeVisible();
    await capture('staff-conflict');
    await page.getByRole('button', { name: 'Reload latest details' }).click();
    await expect(page.getByRole('combobox', { name: 'IT Priority', exact: true })).toHaveValue('LOW');
    await page.getByRole('button', { name: 'Claim ticket', exact: true }).click();
    await expect(page.getByText('Ticket updated.', { exact: true })).toBeVisible();
    for (const state of ['OPEN', 'IN_PROGRESS']) {
      await page.getByLabel('Next status').selectOption(state);
      await page.getByRole('button', { name: 'Update status' }).click();
      await expect(page.getByLabel('Next status')).toHaveValue('');
    }

    await login(page, requesterA.email, `/tickets/${ticket.id}`);
    await expect(page.getByText('We are checking the printer connection.', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Internal Notes/ })).toHaveCount(0);
    await expect(page.getByText('Private diagnostic draft — must remain internal.')).toHaveCount(0);
    await capture('requester-public-attachment');
    await page.getByRole('button', { name: 'Problem appears resolved' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await capture('requester-confirmation');
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByText(/You reported this problem appears resolved/)).toBeVisible();
    await capture('requester-indication');

    await login(page, 'e2e.staff@example.test', `/staff/tickets/${ticket.id}`);
    for (const state of ['RESOLVED', 'CLOSED']) {
      await page.getByLabel('Next status').selectOption(state);
      await page.getByRole('button', { name: 'Update status' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Update status' })).toBeFocused();
      await page.getByRole('button', { name: 'Update status' }).click();
      await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
      await expect(page.getByLabel('Next status')).toHaveValue('');
    }
    await expect(page.getByLabel('Public comment', { exact: true })).toHaveCount(0);
    await capture('staff-terminal');
    await page.goto('/staff/tickets/00000000-0000-4000-8000-000000000000');
    await expect(page.getByText('This ticket was not found.')).toBeVisible();
    await capture('staff-not-found');

    await login(page, 'e2e.admin@example.test', `/staff/tickets/${ticket.id}`);
    await expect(page.getByRole('heading', { name: 'Ticket oversight' })).toBeVisible();
    await expect(page.getByLabel('Next status')).toHaveCount(0);
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await capture('admin-restricted-detail');
    await page.goto('/admin/users');
    await page.getByRole('button', { name: /Create user/ }).click();
    await capture('admin-create');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
    await capture('admin-create-validation');
  });
}
