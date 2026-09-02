import { expect, test } from '@playwright/test';
import {
  createTicket,
  fillTicketForm,
  pdfBytes,
  pngBytes,
  requesterA,
  requesterB,
  selectRequester,
  uploadAttachment,
} from './helpers.js';

test('E2E-01 creates a Ticket, finds it in My Tickets, and opens owned detail', async ({ page }) => {
  await selectRequester(page);
  await page.getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Create Ticket' })
    .click();
  const summary = `[E2E-01] Requester journey ${Date.now()}`;
  await fillTicketForm(page, summary);
  await page.locator('#ticket-attachments').setInputFiles({
    name: 'request-evidence.pdf',
    mimeType: 'application/pdf',
    buffer: pdfBytes,
  });
  await page.getByRole('button', { name: 'Submit Ticket' }).click();

  await expect(page.getByRole('heading', { name: 'Ticket created' })).toBeFocused();
  const ticketNumber = (await page.locator('.ticket-number').textContent())?.trim();
  expect(ticketNumber).toMatch(/^TKT-\d{8}-[A-F0-9]{8}$/);
  await expect(page.getByText('Uploaded', { exact: true })).toBeVisible();

  await page.getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'My Tickets' })
    .click();
  await page.getByLabel('Search tickets').fill(ticketNumber!);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText(summary, { exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: new RegExp(`View Ticket ${ticketNumber}`) }).first().click();
  await expect(page.getByRole('heading', { name: summary })).toBeVisible();
  await expect(page.getByText('request-evidence.pdf', { exact: true })).toBeVisible();
});

test('E2E-02 switches requester and protects direct Ticket and Attachment access', async ({ page, request }) => {
  const ticket = await createTicket(request, `[E2E-02] Ownership ${Date.now()}`);
  const attachment = await uploadAttachment(request, ticket.id, 'ownership-proof.png');

  await selectRequester(page, requesterA);
  await page.getByLabel('Search tickets').fill(ticket.ticketNumber);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText(ticket.ticketNumber).first()).toBeVisible();

  await page.getByRole('button', { name: 'Change Requester' }).click();
  await page.getByLabel('Development Requester', { exact: true }).selectOption(requesterB.id);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText(ticket.ticketNumber)).toHaveCount(0);
  await page.getByLabel('Search tickets').fill(ticket.ticketNumber);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No tickets match these filters' })).toBeVisible();

  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.getByRole('heading', { name: 'Ticket not found' })).toBeVisible();

  const metadata = await request.get(`/api/attachments/${attachment.id}`, {
    headers: { 'X-Requester-Id': requesterB.id },
  });
  expect(metadata.status()).toBe(404);
  expect(await metadata.json()).toEqual({
    error: { code: 'RESOURCE_NOT_FOUND', message: 'The requested resource was not found.' },
  });
  const removal = await request.delete(`/api/attachments/${attachment.id}`, {
    headers: { 'X-Requester-Id': requesterB.id },
    data: { reason: 'Cross requester attempt' },
  });
  expect(removal.status()).toBe(404);
  expect(await removal.json()).toEqual(await metadata.json());
});

test('E2E-03 exercises invalid, limit, download, and soft-removal Attachment states', async ({ page, request }) => {
  const ticket = await createTicket(request, `[E2E-03] Attachment lifecycle ${Date.now()}`);
  await selectRequester(page);
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.getByRole('heading', { name: 'Attachments' })).toBeVisible();

  const fileInput = page.locator('.attachment-add input[type="file"]');
  await fileInput.setInputFiles({ name: 'unsafe.txt', mimeType: 'text/plain', buffer: Buffer.from('unsafe') });
  await expect(page.getByText(/Choose a JPG, PNG, WEBP, or PDF/)).toBeVisible();
  await page.getByRole('button', { name: 'Remove selection' }).click();

  await fileInput.setInputFiles({ name: 'primary-evidence.png', mimeType: 'image/png', buffer: pngBytes });
  await expect(page.getByText('primary-evidence.png uploaded.')).toBeVisible();
  const additional = await Promise.all([
    uploadAttachment(request, ticket.id, 'evidence-2.png'),
    uploadAttachment(request, ticket.id, 'evidence-3.png'),
    uploadAttachment(request, ticket.id, 'evidence-4.png'),
    uploadAttachment(request, ticket.id, 'evidence-5.png'),
  ]);
  expect(additional).toHaveLength(4);
  await page.reload();
  await expect(page.getByText('5 of 5 active attachments')).toBeVisible();

  await page.locator('.attachment-add input[type="file"]').setInputFiles({
    name: 'sixth-evidence.png', mimeType: 'image/png', buffer: pngBytes,
  });
  await expect(page.getByText('This Ticket already has five active Attachments.')).toBeVisible();
  await page.getByRole('button', { name: 'Remove selection' }).click();

  const primaryRow = page.locator('.attachment-row').filter({ hasText: 'primary-evidence.png' });
  const downloadPromise = page.waitForEvent('download');
  await primaryRow.getByRole('button', { name: 'Download' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('primary-evidence.png');

  await primaryRow.getByRole('button', { name: 'Remove' }).click();
  const dialog = page.getByRole('dialog', { name: 'Remove primary-evidence.png?' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Removal reason').fill('Superseded by verified evidence');
  await dialog.getByRole('button', { name: 'Remove Attachment' }).click();
  await expect(primaryRow.getByText(/Removed .*Superseded by verified evidence/)).toBeVisible();
  await expect(primaryRow.getByRole('button', { name: 'Download' })).toHaveCount(0);

  const detailResponse = await request.get(`/api/tickets/${ticket.id}`, {
    headers: { 'X-Requester-Id': requesterA.id },
  });
  const detail = await detailResponse.json() as { data: { attachments: Array<{ id: string; originalName: string }> } };
  const primary = detail.data.attachments.find((item) => item.originalName === 'primary-evidence.png');
  const removedDownload = await request.get(`/api/attachments/${primary!.id}/download`, {
    headers: { 'X-Requester-Id': requesterA.id },
  });
  expect(removedDownload.status()).toBe(404);
});
