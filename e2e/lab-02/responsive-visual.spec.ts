import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  createTicket,
  expectNoHorizontalOverflow,
  fillTicketForm,
  pngBytes,
  requesterA,
  selectRequester,
  uploadAttachment,
} from './helpers.js';

const screenshotRoot = process.env.LAB2_CAPTURE_EVIDENCE === '1'
  ? path.resolve('artifacts', 'lab-02', 'screenshots')
  : path.resolve('test-results', 'lab-02', 'screenshots');
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
    await mkdir(path.dirname(path.join(screenshotRoot, relativePath)), { recursive: true });
    await page.screenshot({
      path: path.join(screenshotRoot, relativePath),
      fullPage: true,
      animations: 'disabled',
    });
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  const requesterApiUrl = 'http://127.0.0.1:5100/api/requesters';
  let releaseRequesterFailure = () => {};
  const requesterFailureGate = new Promise<void>((resolve) => { releaseRequesterFailure = resolve; });
  await page.route(requesterApiUrl, async (route) => {
    await requesterFailureGate;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' } }),
    });
  });
  await page.goto('/select-requester');
  await expect(page.getByText('Loading requesters...')).toBeVisible();
  await capture('requester-selection/desktop-loading.png');
  releaseRequesterFailure();
  await expect(page.getByText('Unable to load Development Requesters. Try again.')).toBeVisible();
  await capture('requester-selection/desktop-failure.png');
  await page.unroute(requesterApiUrl);
  await page.getByRole('button', { name: 'Retry' }).click();
  const requesterSelect = page.getByLabel('Development Requester', { exact: true });
  await expect(requesterSelect).toBeEnabled();
  await capture('requester-selection/desktop-ready.png');
  await requesterSelect.selectOption(requesterA.id);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();

  const detailTicket = await createTicket(request, '[VIS-01] Attachment lifecycle evidence');
  await uploadAttachment(request, detailTicket.id, 'active-evidence.png');
  await uploadAttachment(request, detailTicket.id, 'removal-evidence.png');

  await page.goto('/tickets/new');
  await expect(page.getByLabel(/Category/)).toBeEnabled();
  await capture('create-ticket/desktop-initial.png');
  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await expect(page.getByRole('alert')).toContainText('Please correct');
  await capture('create-ticket/desktop-validation.png');
  await page.locator('#ticket-attachments').setInputFiles({
    name: 'invalid-evidence.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid'),
  });
  await expect(page.getByText('Attachments must be JPG, PNG, WEBP, or PDF files.')).toBeVisible();
  await capture('create-ticket/desktop-invalid-attachment.png');
  await page.getByRole('button', { name: 'Clear selected files' }).click();
  await fillTicketForm(page, '[VIS-01] Successful create state');

  let releaseTicketFailure = () => {};
  const ticketFailureGate = new Promise<void>((resolve) => { releaseTicketFailure = resolve; });
  await page.route('**/api/tickets', async (route) => {
    await ticketFailureGate;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' } }),
    });
  }, { times: 1 });
  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await expect(page.getByRole('button', { name: 'Submitting...' })).toBeDisabled();
  await capture('create-ticket/desktop-submitting.png');
  releaseTicketFailure();
  await expect(page.getByRole('alert')).toContainText('Ticket could not be created. Try again.');
  await expect(page.getByLabel(/Summary/)).toHaveValue('[VIS-01] Successful create state');
  await capture('create-ticket/desktop-api-failure.png');
  await page.unroute('**/api/tickets');
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
  await page.getByRole('button', { name: 'Change Requester' }).click();
  await page.getByLabel('Development Requester', { exact: true }).selectOption('22222222-2222-4222-8222-222222222222');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText(detailTicket.ticketNumber)).toHaveCount(0);
  await capture('my-tickets/desktop-requester-switched.png');
  await page.getByRole('button', { name: 'Change Requester' }).click();
  await page.getByLabel('Development Requester', { exact: true }).selectOption(requesterA.id);
  await page.getByRole('button', { name: 'Continue' }).click();
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

  const detailFileInput = page.locator('.attachment-add input[type="file"]');
  await detailFileInput.setInputFiles({
    name: 'invalid-evidence.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid'),
  });
  await expect(page.locator('.attachment-invalid')).toBeVisible();
  await capture('ticket-detail/desktop-invalid-attachment.png');
  await page.getByRole('button', { name: 'Remove selection' }).click();

  let releaseFailedUpload = () => {};
  const failedUploadGate = new Promise<void>((resolve) => { releaseFailedUpload = resolve; });
  const uploadPattern = `**/api/tickets/${detailTicket.id}/attachments`;
  await page.route(uploadPattern, async (route) => {
    await failedUploadGate;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'ATTACHMENT_UPLOAD_FAILED', message: 'The Attachment could not be uploaded. Try again.' } }),
    });
  }, { times: 1 });
  await detailFileInput.setInputFiles({
    name: 'failed-evidence.png', mimeType: 'image/png', buffer: pngBytes,
  });
  await expect(page.locator('.attachment-uploading')).toBeVisible();
  await capture('ticket-detail/desktop-uploading-attachment.png');
  releaseFailedUpload();
  await expect(page.locator('.attachment-failed')).toBeVisible();
  await capture('ticket-detail/desktop-failed-attachment.png');
  await page.unroute(uploadPattern);
  await page.getByRole('button', { name: 'Remove selection' }).click();

  const activeRow = page.locator('.attachment-row').filter({ hasText: 'active-evidence.png' });
  await page.route('**/api/attachments/*/download', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'ATTACHMENT_FILE_UNAVAILABLE', message: 'This file cannot be downloaded right now.' } }),
    });
  }, { times: 1 });
  await activeRow.getByRole('button', { name: 'Download' }).click();
  await expect(activeRow.getByText('Unavailable', { exact: true })).toBeVisible();
  await capture('ticket-detail/desktop-unavailable-attachment.png');

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
