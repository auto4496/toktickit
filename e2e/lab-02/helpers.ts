import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const requesterA = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.com',
};

export const requesterB = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Michael Chen',
  email: 'michael.chen@example.com',
};

export const pngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

export const pdfBytes = Buffer.from('%PDF-1.4\n% TokTickIT E2E evidence\n');

export async function selectRequester(page: Page, requester = requesterA) {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/select-requester');
  const requesterSelect = page.getByLabel('Development Requester', { exact: true });
  await expect(requesterSelect).toBeEnabled();
  await requesterSelect.selectOption(requester.id);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
}

export async function referenceIds(request: APIRequestContext) {
  const [categoriesResponse, systemsResponse] = await Promise.all([
    request.get('/api/categories'),
    request.get('/api/related-systems'),
  ]);
  expect(categoriesResponse.ok()).toBeTruthy();
  expect(systemsResponse.ok()).toBeTruthy();
  const categories = await categoriesResponse.json() as Array<{ id: number; name: string }>;
  const systems = await systemsResponse.json() as Array<{ id: number; name: string }>;
  return {
    categoryId: categories.find((item) => item.name === 'Software')?.id ?? categories[0].id,
    relatedSystemId: systems.find((item) => item.name === 'Customer Portal')?.id ?? systems[0].id,
  };
}

export async function createTicket(
  request: APIRequestContext,
  summary: string,
  requesterId = requesterA.id,
) {
  const references = await referenceIds(request);
  const response = await request.post('/api/tickets', {
    headers: {
      'X-Requester-Id': requesterId,
      'Idempotency-Key': randomUUID(),
    },
    data: {
      ...references,
      summary,
      requestedPriority: 'HIGH',
      description: 'Deterministic requester journey evidence for the Lab 2 quality gate.',
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json() as { data: { id: string; ticketNumber: string } }).data;
}

export async function uploadAttachment(
  request: APIRequestContext,
  ticketId: string,
  name: string,
  requesterId = requesterA.id,
) {
  const response = await request.post(`/api/tickets/${ticketId}/attachments`, {
    headers: { 'X-Requester-Id': requesterId },
    multipart: { file: { name, mimeType: 'image/png', buffer: pngBytes } },
  });
  expect(response.status()).toBe(201);
  return (await response.json() as { data: { id: string; originalName: string } }).data;
}

export async function fillTicketForm(page: Page, summary: string) {
  await expect(page.getByLabel(/Category/)).toBeEnabled();
  await page.getByLabel(/Category/).selectOption({ label: 'Software' });
  await page.getByLabel(/Related System/).selectOption({ label: 'Customer Portal' });
  await page.getByLabel(/Requested Priority/).selectOption('HIGH');
  await page.getByLabel(/Summary/).fill(summary);
  await page.getByLabel(/Description/).fill(
    'Requester-reported issue used to verify the complete Lab 2 browser journey.',
  );
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
}
