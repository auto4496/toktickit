/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { AUTH_EVENT, clearAuthState } from '../../src/auth-api';
vi.mock('../../src/StaffTicketQueue', () => ({ default: () => <h1>Ticket lookup workspace</h1> }));
const admin = { id: '11111111-1111-4111-8111-111111111111', name: 'Taylor Admin', email: 'admin@example.test', role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false, version: 1 };
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
beforeEach(() => {
  clearAuthState(); history.replaceState({}, '', '/staff/tickets');
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/auth/me') ? json({ user: admin }) : url.endsWith('/auth/csrf') ? json({ csrfToken: 'test' }) : url.endsWith('/auth/logout') ? new Response(null, { status: 204 }) : json({ data: [admin] })));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function dirtyEditor() {
  render(<App />); fireEvent.click(await screen.findByRole('link', { name: 'Users', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Taylor Admin' }));
  fireEvent.change(screen.getByLabelText('Name', { exact: true }), { target: { value: 'Unsaved name' } });
}
it('guards shell navigation and preserves the draft when cancelled', async () => {
  await dirtyEditor(); fireEvent.click(screen.getByRole('link', { name: 'Ticket Lookup' }));
  const dialog = await screen.findByRole('dialog'); expect(location.pathname).toBe('/admin/users');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' })); expect(screen.getByLabelText('Name', { exact: true })).toHaveValue('Unsaved name');
  fireEvent.click(screen.getByRole('link', { name: 'Ticket Lookup' })); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }));
  expect(await screen.findByRole('heading', { name: 'Ticket lookup workspace' })).toBeVisible(); expect(location.pathname).toBe('/staff/tickets');
});
it('restores browser Back on cancel and replays the original history traversal on confirm', async () => {
  await dirtyEditor(); act(() => history.back()); const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(location.pathname).toBe('/admin/users')); fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' })); expect(screen.getByLabelText('Name', { exact: true })).toHaveValue('Unsaved name');
  act(() => history.back()); fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm' }));
  await screen.findByRole('heading', { name: 'Ticket lookup workspace' }); expect(location.pathname).toBe('/staff/tickets');
  act(() => history.forward()); expect(await screen.findByRole('button', { name: 'Edit Taylor Admin' })).toBeVisible(); expect(screen.queryByLabelText('Name', { exact: true })).toBeNull();
});
it('guards voluntary password navigation but does not block logout', async () => {
  await dirtyEditor(); fireEvent.click(screen.getByRole('button', { name: 'Password', exact: true })); fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  expect(screen.getByLabelText('Name', { exact: true })).toHaveValue('Unsaved name'); fireEvent.click(screen.getByRole('button', { name: 'Logout' })); expect(await screen.findByRole('heading', { name: 'Sign in to TokTickIT' })).toBeVisible(); expect(screen.queryByRole('dialog')).toBeNull();
});
it.each(['expired', 'password'])('mandatory auth event %s bypasses an open discard prompt', async detail => {
  await dirtyEditor(); fireEvent.click(screen.getByRole('link', { name: 'Ticket Lookup' })); await screen.findByRole('dialog');
  act(() => window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail })));
  expect(await screen.findByRole('heading', { name: detail === 'expired' ? 'Sign in to TokTickIT' : 'Choose your new password' })).toBeVisible(); expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.queryByDisplayValue('Unsaved name')).toBeNull();
});
