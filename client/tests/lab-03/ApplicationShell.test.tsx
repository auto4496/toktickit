/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { AUTH_EVENT, clearAuthState } from '../../src/auth-api';

const user = { id: '11111111-1111-4111-8111-111111111111', name: 'Jennifer Anderson', email: 'jennifer@example.test', role: 'REQUESTER', mustChangePassword: false };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const anonymous = () => json({ error: { code: 'AUTH_REQUIRED', message: 'Sign in to continue.' } }, 401);
beforeEach(() => { clearAuthState(); history.replaceState({}, '', '/'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Authenticated application shell (replaces development selector/system-check UI)', () => {
  it.each(['/tickets', '/tickets/new', '/staff/tickets', '/admin/users', '/lab-01'])('guards direct anonymous access to %s', async path => {
    history.replaceState({}, '', path);
    localStorage.setItem('toktickit.requester', JSON.stringify(user));
    const fetch = vi.fn().mockResolvedValue(anonymous()); vi.stubGlobal('fetch', fetch);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Sign in to TokTickIT' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Development Requester')).not.toBeInTheDocument();
    expect(localStorage.getItem('toktickit.requester')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('shows a retriable safe session-check failure', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('private SQL')).mockResolvedValueOnce(anonymous());
    vi.stubGlobal('fetch', fetch); render(<App />);
    expect(await screen.findByRole('alert')).not.toHaveTextContent('private SQL');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Sign in to TokTickIT' })).toBeInTheDocument();
  });
  it('gates an initial-password account before any application data is fetched', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ user: { ...user, mustChangePassword: true } }));
    vi.stubGlobal('fetch', fetch); render(<App />);
    expect(await screen.findByRole('heading', { name: 'Choose your new password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([['IT_STAFF', '/staff/tickets', 'Ticket Queue'], ['ADMINISTRATOR', '/admin/users', 'Users']])('lands %s on its own navigation', async (role, path, label) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ user: { ...user, role } })));
    render(<App />);
    expect(await screen.findByRole('link', { name: label })).toHaveAttribute('href', path);
    expect(location.pathname).toBe(path);
    expect(screen.queryByRole('link', { name: 'Create Ticket' })).not.toBeInTheDocument();
  });
  it('clears protected content immediately on session expiry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ user: { ...user, role: 'IT_STAFF' } })));
    render(<App />); await screen.findByText(user.name);
    sessionStorage.setItem('toktickit.create-ticket.pending', 'private');
    act(() => { clearAuthState(); window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: 'expired' })); });
    expect(screen.queryByText(user.name)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in to TokTickIT' })).toBeInTheDocument();
    expect(sessionStorage.getItem('toktickit.create-ticket.pending')).toBeNull();
  });
  it('logs out through CSRF and drops user state', async () => {
    const fetch = vi.fn((input) => Promise.resolve(String(input).endsWith('/me') ? json({ user: { ...user, role: 'IT_STAFF' } }) : String(input).endsWith('/csrf') ? json({ csrfToken: 'logout-csrf' }) : new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetch); render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Logout' }));
    expect(await screen.findByRole('heading', { name: 'Sign in to TokTickIT' })).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(new Headers(fetch.mock.calls[2][1]?.headers).get('X-CSRF-Token')).toBe('logout-csrf');
  });
});
