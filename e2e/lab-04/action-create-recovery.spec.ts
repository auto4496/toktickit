import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createTicket } from '../lab-02/helpers';
import { loginAs } from './helpers';

test('recovers committed creation after a lost response, retaining edits without duplicate Actions', async ({ page, request }) => {
  const ticket = await createTicket(request, `[E2E-L4-CREATE-RECOVERY] ${randomUUID()}`);
  await loginAs(page, 'e2e.staff@example.test', `/staff/tickets/${ticket.id}`);
  await page.getByRole('button', { name: 'Add Action' }).click();
  await page.getByLabel('Action Description').fill('Original submitted Action');
  await page.getByLabel('Assigned to').selectOption({ label: 'Alex Morgan' });
  const attempts: { key: string | undefined; body: unknown }[] = [];
  let savedId = '';
  await page.route(`**/api/tickets/${ticket.id}/actions`, async route => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    attempts.push({ key: route.request().headers()['idempotency-key'], body: route.request().postDataJSON() });
    const response = await route.fetch();
    if (attempts.length === 1) {
      expect(response.status()).toBe(201);
      savedId = (await response.json()).data.id;
      await route.abort('failed');
    } else {
      expect(response.status()).toBe(200);
      expect(response.headers()['idempotency-replayed']).toBe('true');
      await route.fulfill({ response });
    }
  });
  await page.getByRole('button', { name: 'Save Action' }).click();
  await expect(page.getByRole('button', { name: 'Recover saved Action' })).toBeVisible();
  await page.getByLabel('Action Description').fill('Edited draft after the lost response');
  await expect(page.getByRole('button', { name: 'Save Action' })).toBeDisabled();
  await page.getByRole('button', { name: 'Recover saved Action' }).click();
  await expect(page.getByText(/Original Action recovered/)).toBeVisible();
  await expect(page.getByLabel('Action Description')).toHaveValue('Edited draft after the lost response');
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
  await page.getByRole('button', { name: 'Save Action' }).click();
  await expect(page.getByRole('heading', { name: 'Edited draft after the lost response' })).toBeVisible();
  const list = await (await page.request.get(`/api/tickets/${ticket.id}/actions`)).json();
  expect(list.meta.totalItems).toBe(1);
  expect(list.data[0]).toMatchObject({ id: savedId, description: 'Edited draft after the lost response', version: 2 });
  const detail = await (await page.request.get(`/api/tickets/${ticket.id}/actions/${savedId}`)).json();
  expect(detail.revisions.map((row: { operation: string }) => row.operation)).toEqual(['CREATED', 'EDITED']);
});

test('releases a definitively rejected creation after its response is lost so the corrected draft can be saved', async ({ page, request }) => {
  const ticket = await createTicket(request, `[E2E-L4-REJECTED-RECOVERY] ${randomUUID()}`);
  await loginAs(page, 'e2e.staff@example.test', `/staff/tickets/${ticket.id}`);
  await page.getByRole('button', { name: 'Add Action' }).click();
  // Native required accepts whitespace; the server must reject its normalized empty description.
  await page.getByLabel('Action Description').fill('   ');
  await page.getByLabel('Assigned to').selectOption({ label: 'Alex Morgan' });
  const attempts: { key: string | undefined; body: unknown }[] = [];
  await page.route(`**/api/tickets/${ticket.id}/actions`, async route => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    attempts.push({ key: route.request().headers()['idempotency-key'], body: route.request().postDataJSON() });
    const response = await route.fetch();
    if (attempts.length <= 2) {
      expect(response.status()).toBe(400);
      expect((await response.json()).error.code).toBe('VALIDATION_FAILED');
    } else expect(response.status()).toBe(201);
    if (attempts.length === 1) await route.abort('failed');
    else await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Save Action' }).click();
  await expect(page.getByRole('button', { name: 'Recover saved Action' })).toBeVisible();
  await page.getByLabel('Action Description').fill('Corrected draft after lost validation response');
  await page.getByRole('button', { name: 'Recover saved Action' }).click();
  await expect(page.getByText(/Your draft is retained. Correct it and save again, or cancel/)).toBeVisible();
  await expect(page.getByLabel('Action Description')).toHaveValue('Corrected draft after lost validation response');
  await expect(page.getByRole('button', { name: 'Recover saved Action' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save Action' })).toBeEnabled();
  await expect(page.locator('.lab4-actions').getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled();
  expect(attempts[1]).toEqual(attempts[0]);
  const rejected = await (await page.request.get(`/api/tickets/${ticket.id}/actions`)).json();
  expect(rejected.meta.totalItems).toBe(0);
  await page.getByRole('button', { name: 'Save Action' }).click();
  await expect(page.getByRole('heading', { name: 'Corrected draft after lost validation response' })).toBeVisible();
  expect(attempts).toHaveLength(3);
  expect(attempts[2].key).not.toBe(attempts[0].key);
  const saved = await (await page.request.get(`/api/tickets/${ticket.id}/actions`)).json();
  expect(saved.meta.totalItems).toBe(1);
  expect(saved.data[0]).toMatchObject({ description: 'Corrected draft after lost validation response', version: 1 });
  const detail = await (await page.request.get(`/api/tickets/${ticket.id}/actions/${saved.data[0].id}`)).json();
  expect(detail.revisions.map((row: { operation: string }) => row.operation)).toEqual(['CREATED']);
});
