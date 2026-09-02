import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  createTicket,
  expectNoHorizontalOverflow,
  fillTicketForm,
  requesterA,
  selectRequester,
  uploadAttachment,
} from './helpers.js';

const screenshotRoot = path.resolve('artifacts', 'lab-02', 'screenshots');
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`RESP-01 keeps every requester screen usable at ${viewport.name}`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/select-requester');
    await expect(page.getByRole('heading', { name: 'Select Development Requester' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const longSummary = `[RESP-${viewport.name}] ${'Long requester-visible summary '.repeat(3)}`.slice(0, 120);
    const ticket = await createTicket(request, longSummary);
    await uploadAttachment(
      request,
      ticket.id,
      `${'long-attachment-name-'.repeat(8)}evidence.png`.slice(-190),
    );
    await selectRequester(page, requesterA);
    await expectNoHorizontalOverflow(page);
    if (viewport.name === 'mobile') {
      await expect(page.locator('.ticket-card-list')).toBeVisible();
    } else {
      await expect(page.locator('.ticket-table-wrap')).toBeVisible();
    }

    await page.goto('/tickets/new');
    await expect(page.getByRole('button', { name: 'Submit Ticket' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto(`/tickets/${ticket.id}`);
    await expect(page.locator('.attachment-add input[type="file"]')).toBeAttached();
    await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Remove' })).toBeFocused();
  });
}

test('VIS-01 captures the complete Zen Green screenshot contract', async ({ page, request }) => {
  await mkdir(screenshotRoot, { recursive: true });
  const capture = async (relativePath: string) => {
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotRoot, relativePath),
      fullPage: true,
      animations: 'disabled',
    });
  };

  const detailTicket = await createTicket(request, '[VIS-01] Attachment lifecycle evidence');
  await uploadAttachment(request, detailTicket.id, 'active-evidence.png');
  await uploadAttachment(request, detailTicket.id, 'removal-evidence.png');
  await selectRequester(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tickets/new');
  await expect(page.getByLabel(/Category/)).toBeEnabled();
  await capture('create-ticket/desktop-initial.png');
  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await expect(page.getByRole('alert')).toContainText('Please correct');
  await capture('create-ticket/desktop-validation.png');
  await fillTicketForm(page, '[VIS-01] Successful create state');
  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await expect(page.getByRole('heading', { name: 'Ticket created' })).toBeVisible();
  await capture('create-ticket/desktop-success.png');
  await page.getByRole('button', { name: 'Create Another' }).click();
  await expect(page.getByLabel(/Category/)).toBeEnabled();
  await page.setViewportSize({ width: 834, height: 1112 });
  await capture('create-ticket/tablet.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('create-ticket/mobile.png');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tickets');
  await page.getByLabel('Search tickets').fill('[VIS-01]');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText(detailTicket.ticketNumber).first()).toBeVisible();
  await capture('my-tickets/desktop-loaded.png');
  await page.getByLabel('Search tickets').fill('VISUAL-NO-RESULTS');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No tickets match these filters' })).toBeVisible();
  await capture('my-tickets/desktop-no-results.png');
  await page.getByRole('button', { name: 'Clear Filters' }).first().click();
  await page.getByLabel('Search tickets').fill('[VIS-01]');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText(detailTicket.ticketNumber).first()).toBeVisible();
  await page.setViewportSize({ width: 834, height: 1112 });
  await capture('my-tickets/tablet.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.ticket-card-list')).toBeVisible();
  await capture('my-tickets/mobile-cards.png');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/tickets/${detailTicket.id}`);
  await expect(page.getByText('active-evidence.png', { exact: true })).toBeVisible();
  await capture('ticket-detail/desktop-active-attachments.png');
  const removalRow = page.locator('.attachment-row').filter({ hasText: 'removal-evidence.png' });
  await removalRow.getByRole('button', { name: 'Remove' }).click();
  await page.getByLabel('Removal reason').fill('Visual evidence completed');
  await page.getByRole('button', { name: 'Remove Attachment' }).click();
  await expect(removalRow.getByText(/Removed .*Visual evidence completed/)).toBeVisible();
  await capture('ticket-detail/desktop-removed-attachment.png');
  await page.setViewportSize({ width: 834, height: 1112 });
  await capture('ticket-detail/tablet.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('ticket-detail/mobile.png');
});
