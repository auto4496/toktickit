/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TicketConversation from '../../src/TicketConversation';
import { acceptCsrf, clearAuthState } from '../../src/auth-api';

beforeEach(() => { clearAuthState(); acceptCsrf('test-csrf'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const entry = (id: number) => ({ id: String(id), content: id === 21 ? 'Saved despite the lost response' : `Earlier entry ${id}`, author: { name: 'Alex', role: 'IT_STAFF' }, createdAt: '2026-09-16T00:00:00Z' });
const response = (page: number, saved: boolean) => new Response(JSON.stringify({
  data: page === 1 ? Array.from({ length: 20 }, (_, i) => entry(i + 1)) : [entry(21)],
  meta: { page, pageSize: 20, totalItems: saved ? 21 : 20, totalPages: saved ? 2 : 1 },
}));

it.each(['comments', 'internal-notes'])('shows the saved 21st %s entry before enabling a deliberate retry', async resource => {
  let saved = false;
  let resolveLatest!: (response: Response) => void;
  const latest = new Promise<Response>(resolve => { resolveLatest = resolve; });
  const fetch = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'POST') { saved = true; return Promise.reject(new Error('Response lost')); }
    if (url.includes(`/${resource}?page=2&`)) return latest;
    return Promise.resolve(response(1, saved));
  });
  vi.stubGlobal('fetch', fetch);
  render(<TicketConversation ticketId="ticket" role="IT_STAFF" terminal={false} />);
  if (resource === 'internal-notes') fireEvent.click(screen.getByRole('tab', { name: /Internal Notes/ }));
  await screen.findByText('Earlier entry 20');
  const field = screen.getByLabelText(resource === 'comments' ? 'Public comment' : 'Internal note');
  const button = screen.getByRole('button', { name: resource === 'comments' ? 'Post public comment' : 'Add internal note' });
  fireEvent.change(field, { target: { value: 'Saved despite the lost response' } }); fireEvent.click(button);
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes(`/${resource}?page=2&`))).toBe(true));
  expect(button).toBeDisabled(); expect(field).toHaveValue('Saved despite the lost response');
  expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  await act(async () => resolveLatest(response(2, true)));
  expect(await screen.findByText('Saved despite the lost response', { selector: '.wf-entries p' })).toBeInTheDocument();
  expect(screen.getByText('Page 2 of 2')).toBeInTheDocument(); expect(button).toBeEnabled();
  expect(field).toHaveValue('Saved despite the lost response');
  expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
});

it('keeps recovery pending after a failed latest-page read and a tab switch', async () => {
  let saved = false, latestFails = true;
  const fetch = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'POST') { saved = true; return Promise.reject(new Error('Response lost')); }
    if (url.includes('/comments?page=2&')) return latestFails ? Promise.reject(new Error('Read failed')) : Promise.resolve(response(2, true));
    return Promise.resolve(response(1, saved));
  });
  vi.stubGlobal('fetch', fetch); render(<TicketConversation ticketId="ticket" role="IT_STAFF" terminal={false} />);
  await screen.findByText('Earlier entry 20');
  fireEvent.change(screen.getByLabelText('Public comment'), { target: { value: 'Saved despite the lost response' } });
  fireEvent.click(screen.getByRole('button', { name: 'Post public comment' }));
  await screen.findByRole('button', { name: 'Reload conversation' });
  expect(screen.getByRole('button', { name: 'Post public comment' })).toBeDisabled();
  fireEvent.click(screen.getByRole('tab', { name: /Internal Notes/ })); await screen.findByText('Earlier entry 20');
  expect(screen.getByLabelText('Internal note')).toHaveValue('');
  latestFails = false; fireEvent.click(screen.getByRole('tab', { name: 'Public Comments' }));
  await screen.findByText('Saved despite the lost response', { selector: '.wf-entries p' });
  expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  expect(screen.getByLabelText('Public comment')).toHaveValue('Saved despite the lost response');
  expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
});
