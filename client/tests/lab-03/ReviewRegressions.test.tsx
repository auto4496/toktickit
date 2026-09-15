/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { acceptCsrf, authRequest, clearAuthState } from '../../src/auth-api';

const user = { id: '11111111-1111-4111-8111-111111111111', name: 'Requester', email: 'requester@example.test', role: 'REQUESTER', mustChangePassword: false };
const ticketId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const target = `/tickets/${ticketId}`;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(() => { clearAuthState(); history.replaceState({}, '', '/'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Rejected CSRF recovery', () => {
  it.each(['login', 'logout'])('refreshes CSRF only on the next explicit %s attempt', async action => {
    acceptCsrf('expired-token');
    const fetch = vi.fn().mockResolvedValueOnce(json({ error: { code: 'CSRF_REJECTED', message: 'Refresh the page and try again.' } }, 403))
      .mockResolvedValueOnce(json({ csrfToken: 'fresh-token' }))
      .mockResolvedValueOnce(action === 'logout' ? new Response(null, { status: 204 }) : json({ user }));
    vi.stubGlobal('fetch', fetch);
    const body = action === 'login' ? { email: user.email, password: 'Synthetic password only' } : {};
    await expect(authRequest(action, body)).rejects.toThrow('Refresh the page');
    expect(fetch).toHaveBeenCalledTimes(1); // No bootstrap or mutation replay yet.
    await authRequest(action, body);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(String(fetch.mock.calls[1][0])).toMatch(/\/auth\/csrf$/);
    expect(fetch.mock.calls[2][1].headers.get('X-CSRF-Token')).toBe('fresh-token');
    expect(fetch.mock.calls[2][1].body).toBe(fetch.mock.calls[0][1].body);
  });
});

function installApi(initialPassword = false) {
  let loggedIn = false;
  let restricted = initialPassword;
  const fetch = vi.fn((input: string) => {
    if (input.endsWith('/auth/me')) return Promise.resolve(loggedIn ? json({ user: { ...user, mustChangePassword: restricted } }) : json({ error: { message: 'Sign in to continue.' } }, 401));
    if (input.endsWith('/auth/csrf')) return Promise.resolve(json({ csrfToken: 'csrf' }));
    if (input.endsWith('/auth/login')) { loggedIn = true; return Promise.resolve(json({ user: { ...user, mustChangePassword: restricted }, csrfToken: 'signed-in-csrf' })); }
    if (input.endsWith('/auth/change-password')) { restricted = false; return Promise.resolve(json({ user, csrfToken: 'rotated-csrf' })); }
    if (input.endsWith(`/api${target}`)) return Promise.resolve(json({ error: { code: 'RESOURCE_NOT_FOUND' } }, 404));
    if (input.endsWith('/api/categories')) return Promise.resolve(json([]));
    if (input.includes('/api/tickets?')) return Promise.resolve(json({ data: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, sortBy: 'updatedAt', sortDirection: 'desc' } }));
    throw new Error(`Unexpected request: ${input}`);
  });
  vi.stubGlobal('fetch', fetch); return fetch;
}
async function signIn() {
  fireEvent.change(await screen.findByLabelText('Email address'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'Synthetic password only' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
}
describe('Intended destination after authentication', () => {
  it('restores a signed-out ticket deep link after login and a login-screen remount', async () => {
    history.replaceState({}, '', target); const fetch = installApi();
    const view = render(<App />); await screen.findByLabelText('Email address');
    view.unmount(); render(<App />); await signIn();
    await waitFor(() => expect(location.pathname).toBe(target));
    expect(await screen.findByRole('heading', { name: 'Ticket not found' })).toBeInTheDocument();
    expect(fetch.mock.calls.filter(([url]) => url.endsWith(`/api${target}`))).toHaveLength(1);
  });
  it('keeps the destination through the initial-password gate and a remount', async () => {
    history.replaceState({}, '', target); const fetch = installApi(true);
    const view = render(<App />); await signIn();
    await screen.findByRole('heading', { name: 'Choose your new password' });
    expect(fetch.mock.calls.some(([url]) => url.includes('/api/tickets'))).toBe(false);
    view.unmount(); render(<App />);
    fireEvent.change(await screen.findByLabelText('Current password', { exact: true }), { target: { value: 'Synthetic password only' } });
    fireEvent.change(screen.getByLabelText('New password', { exact: true }), { target: { value: 'A different synthetic password' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'A different synthetic password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save password and continue' }));
    await waitFor(() => expect(location.pathname).toBe(target));
  });
  it.each(['/admin/users', '/tickets/not-a-uuid', '//evil.example/path', 'https://evil.example/path', '/tickets/%2f%2fevil.example'])('rejects untrusted or disallowed intended destination %s', async intended => {
    history.replaceState({ toktickitReturnTo: intended }, '', '/login'); installApi();
    render(<App />); await signIn();
    await waitFor(() => expect(location.pathname).toBe('/tickets'));
    expect(location.origin).not.toContain('evil.example');
  });
});
