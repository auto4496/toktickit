/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserManagement, { ManagedUser } from '../../src/UserManagement';
import { clearAuthState } from '../../src/auth-api';
const actor: ManagedUser = { id: '11111111-1111-4111-8111-111111111111', name: 'Taylor Admin', email: 'admin@example.test', role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false, version: 1, createdAt: '', updatedAt: '' };
const member: ManagedUser = { ...actor, id: '22222222-2222-4222-8222-222222222222', name: 'Alex Staff', email: 'alex@example.test', role: 'IT_STAFF' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fetched = vi.fn();
beforeEach(() => { clearAuthState(); fetched.mockReset(); vi.stubGlobal('fetch', fetched); HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); }; HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); }; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function respond(mutate?: (path: string, init: RequestInit) => Response) { fetched.mockImplementation(async (path: string, init: RequestInit = {}) => path.endsWith('/auth/csrf') ? json({ csrfToken: 'test' }) : init.method && init.method !== 'GET' ? mutate!(path, init) : json({ data: [actor, member] })); }
const edit = async () => fireEvent.click(await screen.findByRole('button', { name: 'Edit Alex Staff' }));
describe('UI-08 administrator account management', () => {
  it('searches with explicit filters and shows a safe retriable loading failure', async () => {
    fetched.mockRejectedValueOnce(new Error('Connection unavailable')).mockResolvedValue(json({ data: [actor] })); render(<UserManagement user={actor} onSelfChanged={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' })); await screen.findByText('Taylor Admin');
    fireEvent.change(screen.getByLabelText('Search users'), { target: { value: ' Taylor ' } }); fireEvent.change(screen.getByLabelText('Role filter'), { target: { value: 'ADMINISTRATOR' } }); fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    await waitFor(() => expect(fetched.mock.calls.at(-1)?.[0]).toContain('search=Taylor&role=ADMINISTRATOR'));
  });
  it('validates password confirmation without sending, then creates exact fields and clears the editor', async () => {
    respond((_path, init) => { expect(JSON.parse(init.body as string)).toEqual({ name: 'New Member', email: 'new@example.test', role: 'REQUESTER', isActive: true, initialPassword: 'A good initial password 2026' }); return json({ data: { ...member, name: 'New Member' } }, 201); });
    render(<UserManagement user={actor} onSelfChanged={vi.fn()} />); fireEvent.click(await screen.findByRole('button', { name: /Create user/ }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Member' } }); fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.test' } }); fireEvent.change(screen.getByLabelText('Initial password', { exact: true }), { target: { value: 'A good initial password 2026' } }); fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Passwords must match.')).toBeVisible(); expect(fetched.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    fireEvent.change(screen.getByLabelText('Confirm initial password'), { target: { value: 'A good initial password 2026' } }); fireEvent.click(screen.getByRole('button', { name: 'Create account' })); await screen.findByText('Account saved successfully.'); expect(screen.queryByLabelText('Initial password', { exact: true })).toBeNull();
  });
  it('preserves edits and field errors after assigned-owner rejection', async () => {
    respond(() => json({ error: { code: 'USER_HAS_ACTIVE_TICKETS', message: 'Reassign unfinished tickets first.', fieldErrors: { isActive: 'Still owns tickets.' } } }, 409)); render(<UserManagement user={actor} onSelfChanged={vi.fn()} />); await edit(); fireEvent.click(screen.getByRole('switch')); fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Still owns tickets.')).toBeVisible(); expect(screen.getByRole('switch')).not.toBeChecked(); expect(screen.getByLabelText('Name')).toHaveValue(member.name);
  });
  it('requires a review of the latest version and explicit resubmission after conflict', async () => {
    let writes = 0; respond((_path, init) => { writes++; if (writes === 1) return json({ error: { code: 'USER_CONFLICT', message: 'Account changed.' } }, 409); expect(JSON.parse(init.body as string)).toMatchObject({ name: 'Draft name', expectedVersion: 2 }); return json({ data: { ...member, version: 3 } }); });
    render(<UserManagement user={actor} onSelfChanged={vi.fn()} />); await edit(); fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Draft name' } }); fireEvent.click(screen.getByRole('button', { name: 'Save changes' })); await screen.findByText('Account changed.'); expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    fetched.mockImplementationOnce(async () => json({ data: [{ ...member, name: 'Concurrent name', version: 2 }] })); fireEvent.click(screen.getByRole('button', { name: 'Reload latest account' })); await screen.findByText('Concurrent name'); expect(screen.getByLabelText('Name')).toHaveValue('Draft name'); expect(writes).toBe(1); fireEvent.click(screen.getByRole('button', { name: 'Keep my draft with latest version' })); fireEvent.click(screen.getByRole('button', { name: 'Save changes' })); await screen.findByText('Account saved successfully.'); expect(writes).toBe(2);
  });
  it('confirms discard, clears password drafts on cancel, and prevents self deactivation', async () => {
    respond(); render(<UserManagement user={actor} onSelfChanged={vi.fn()} />); fireEvent.click(await screen.findByRole('button', { name: 'Edit Taylor Admin' })); expect(screen.getByRole('switch')).toBeDisabled(); fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Draft' } }); fireEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true })); expect(screen.getByRole('dialog')).toHaveTextContent('Discard account changes?'); fireEvent.click(screen.getByRole('button', { name: 'Confirm', exact: true })); expect(screen.queryByLabelText('Name')).toBeNull();
    await edit(); fireEvent.click(screen.getByRole('button', { name: 'Set new initial password' })); fireEvent.change(screen.getByLabelText('Initial password', { exact: true }), { target: { value: 'temporary secret' } }); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true })); fireEvent.click(screen.getByRole('button', { name: 'Set new initial password' })); expect(screen.getByLabelText('Initial password', { exact: true })).toHaveValue('');
  });
  it('returns own reset to sign in and sends the expected version', async () => {
    const selfChanged = vi.fn(); respond((_path, init) => { expect(JSON.parse(init.body as string)).toMatchObject({ expectedVersion: 1, initialPassword: 'A replacement password 2026', confirmPassword: 'A replacement password 2026' }); return json({ data: { ...actor, version: 2, mustChangePassword: true } }); }); render(<UserManagement user={actor} onSelfChanged={selfChanged} />); fireEvent.click(await screen.findByRole('button', { name: 'Edit Taylor Admin' })); fireEvent.click(screen.getByRole('button', { name: 'Set new initial password' })); expect(screen.getByRole('dialog')).toHaveTextContent('You will return to sign in');
    for (const name of ['Initial password', 'Confirm initial password']) fireEvent.change(screen.getByLabelText(name, { exact: true }), { target: { value: 'A replacement password 2026' } }); fireEvent.click(screen.getByRole('button', { name: 'Set initial password', exact: true })); await waitFor(() => expect(selfChanged).toHaveBeenCalledWith(expect.objectContaining({ version: 2 }), true));
  });
});
