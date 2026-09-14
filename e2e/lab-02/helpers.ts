import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const requesterA = {
  id: '99999999-9999-4999-8999-999999999993',
  name: 'Jennifer Anderson',
  email: 'e2e.jennifer@example.test',
};

export const requesterB = {
  id: '99999999-9999-4999-8999-999999999994',
  name: 'Michael Chen',
  email: 'e2e.michael@example.test',
};

export const pngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

export const pdfBytes = Buffer.from('%PDF-1.4\n% TokTickIT E2E evidence\n');

export const e2ePassword = 'Synthetic e2e green garden 2026';
export async function selectRequester(page: Page, requester = requesterA) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email address').fill(requester.email);
  await page.getByLabel('Password', { exact: true }).fill(e2ePassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
}
const sessions = new WeakMap<APIRequestContext, { id: string; ready: Promise<Record<string,string>> }>();
export async function apiSession(request: APIRequestContext, requesterId = requesterA.id): Promise<Record<string,string>> {
  const previous = sessions.get(request);
  if (previous?.id === requesterId) return previous.ready;
  const ready = (async () => {
    if (previous) await request.post('/api/auth/logout', { headers: await previous.ready, data: {} });
    const boot = await request.get('/api/auth/csrf');
    const response = await request.post('/api/auth/login', { headers: { Origin: 'http://127.0.0.1:3100', 'X-CSRF-Token': (await boot.json()).csrfToken }, data: { email: requesterId === requesterB.id ? requesterB.email : requesterA.email, password: e2ePassword } });
    expect(response.status()).toBe(200);
    return { Origin: 'http://127.0.0.1:3100', 'X-CSRF-Token': (await response.json()).csrfToken };
  })();
  sessions.set(request, { id: requesterId, ready }); return ready;
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
  const authentication = await apiSession(request, requesterId);
  const references = await referenceIds(request);
  const response = await request.post('/api/tickets', {
    headers: {
      ...authentication,
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
    headers: await apiSession(request, requesterId),
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
