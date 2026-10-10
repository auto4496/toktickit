/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { clearAuthState } from '../../src/auth-api';

const user = { id: '11111111-1111-4111-8111-111111111111', name: 'Dashboard user', email: 'd@example.test', role: 'REQUESTER', mustChangePassword: false };
const metrics = { open: 2, waitingForRequester: 1, recentlyUpdated: 3, recentlyResolved: 1 };
const staffMetrics = { unassigned: 2, myOwned: 1, myFollowUps: 3, byStatus: { NEW: 2, CLOSED: 1 }, byPriority: { HIGH: 1 } };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(() => { clearAuthState(); history.replaceState({}, '', '/dashboard'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function install(role = 'REQUESTER', signedIn = true) {
  const fetch = vi.fn((input: string) => {
    if (input.endsWith('/auth/me')) return Promise.resolve(signedIn ? json({ user: { ...user, role } }) : json({ error: { message: 'Sign in to continue.' } }, 401));
    if (input.endsWith('/auth/csrf')) return Promise.resolve(json({ csrfToken: 'synthetic-token' }));
    if (input.endsWith('/auth/login')) { signedIn = true; return Promise.resolve(json({ user: { ...user, role } })); }
    if (input.includes('/api/dashboard/')) return Promise.resolve(json({ asOf: '2026-10-09T10:00:00Z', windowStart: '2026-10-02T10:00:00Z', metrics: role === 'REQUESTER' ? metrics : staffMetrics, recentTickets: [] }));
    if (input.endsWith('/categories')) return Promise.resolve(json([]));
    if (input.endsWith('/eligible-owners')) return Promise.resolve(json({ data: [] }));
    if (input.includes('/tickets?')) return Promise.resolve(json({ data: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, sortBy: 'updatedAt', sortDirection: 'desc' } }));
    throw new Error(`Unexpected request: ${input}`);
  }); vi.stubGlobal('fetch', fetch); return fetch;
}
describe('Dashboard routes reach actual list filter state', () => {
  it('Requester open/waiting cards send filters; navigation on the same list path resets the scope', async () => {
    const fetch = install(); render(<App />);
    fireEvent.click(await screen.findByRole('link', { name: /Open tickets/ }));
    expect(await screen.findByRole('heading', { name: 'My Tickets' })).toBeInTheDocument();
    expect(screen.getByLabelText('Ticket scope')).toHaveValue('open');
    await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes('/api/tickets?') && new URL(url, location.origin).searchParams.get('status') === 'open')).toBe(true));
    fireEvent.click(screen.getByRole('link', { name: 'My Tickets', exact: true }));
    await waitFor(() => expect(screen.getByLabelText('Ticket scope')).toHaveValue(''));
    fireEvent.click(screen.getByRole('link', { name: 'Dashboard', exact: true }));
    expect(await screen.findByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(await screen.findByRole('link', { name: /Waiting for you/ }));
    expect(await screen.findByLabelText('Current Status')).toHaveValue('WAITING_FOR_REQUESTER');
  });
  it.each(['IT_STAFF', 'ADMINISTRATOR'])('%s drill-down sends owner/open, priority and follow-up filters and clears them', async role => {
    history.replaceState({}, '', '/staff/dashboard'); const fetch = install(role); render(<App />);
    fireEvent.click(await screen.findByRole('link', { name: /Owned by you/ }));
    expect(await screen.findByLabelText('Owner')).toHaveValue('me'); expect(screen.getByLabelText('Ticket scope')).toHaveValue('open');
    await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes('owner=me') && url.includes('status=open'))).toBe(true));
    fireEvent.click(screen.getByRole('link', { name: 'Dashboard', exact: true }));
    fireEvent.click(await screen.findByRole('link', { name: /Your follow-up Actions/ }));
    expect(await screen.findByLabelText('Follow-up Actions')).toHaveValue('me'); expect(await screen.findByText(/Each ticket appears once/)).toBeInTheDocument();
    fireEvent.click(within(screen.getByLabelText('Follow-up Actions').closest('form')!).getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByLabelText('Follow-up Actions')).toHaveValue('');
    fireEvent.click(screen.getByRole('link', { name: 'Dashboard', exact: true }));
    fireEvent.click(await screen.findByRole('link', { name: /High/ }));
    expect(await screen.findByLabelText('IT Priority')).toHaveValue('HIGH');
  });
  it('preserves a filtered direct destination through sign in', async () => {
    history.replaceState({}, '', '/tickets?status=open'); install('REQUESTER', false); render(<App />);
    fireEvent.change(await screen.findByLabelText('Email address'), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'Synthetic only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
    expect(await screen.findByLabelText('Ticket scope')).toHaveValue('open'); expect(location.search).toBe('?status=open');
  });
});
