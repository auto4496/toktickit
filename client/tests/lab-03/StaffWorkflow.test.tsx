/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StaffTicketQueue from '../../src/StaffTicketQueue';
import StaffTicketDetail from '../../src/StaffTicketDetail';
import RequesterWorkflow from '../../src/RequesterWorkflow';
import TicketConversation from '../../src/TicketConversation';
import { acceptCsrf, AuthUser, clearAuthState } from '../../src/auth-api';
import { WorkflowTicket } from '../../src/workflow-api';
const user: AuthUser = { id: '11111111-1111-4111-8111-111111111111', name: 'Alex Staff', email: 'alex@example.test', role: 'IT_STAFF', mustChangePassword: false };
const ticket: WorkflowTicket = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', ticketNumber: 'TKT-20260915-ABCD1234', ticketDate: '2026-09-15T01:00:00Z', summary: 'Printer cannot connect', description: 'The printer cannot connect to our network.', requester: { id: 'requester', name: 'Jennifer', email: 'jennifer@example.test' }, owner: null, category: { id: 1, name: 'Hardware' }, relatedSystem: { id: 1, name: 'Office' }, requestedPriority: 'MEDIUM', itPriority: 'HIGH', currentStatus: 'OPEN', version: 4, requesterResolvedAt: null, updatedAt: '2026-09-15T02:00:00Z', attachments: [] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const page = (data: unknown[] = [], totalItems = data.length, current = 1) => ({ data, meta: { page: current, pageSize: 10, totalItems, totalPages: Math.ceil(totalItems / 10) } });
beforeEach(() => {
  clearAuthState(); acceptCsrf('test-token');
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function mockApi(handler?: (url: string, init?: RequestInit) => Response | Promise<Response> | undefined) {
  const fetch = vi.fn((input: string, init?: RequestInit) => {
    const custom = handler?.(input, init); if (custom) return Promise.resolve(custom);
    if (input.endsWith('/eligible-owners')) return Promise.resolve(json({ data: [{ id: user.id, name: user.name, role: user.role }] }));
    if (input.endsWith('/categories')) return Promise.resolve(json([{ id: 1, name: 'Hardware' }]));
    if (input.includes('/comments?') || input.includes('/internal-notes?')) return Promise.resolve(json(page()));
    if (input.includes('/staff/tickets?')) return Promise.resolve(json(page([ticket])));
    return Promise.resolve(json({ data: ticket }));
  });
  vi.stubGlobal('fetch', fetch); return fetch;
}
describe('UI-04 queue', () => {
  it('applies filters deliberately and resets pagination; opens an explicit ticket link', async () => {
    const fetch = mockApi(url => url.includes('/staff/tickets?') ? json(page([ticket], 21)) : undefined);
    const open = vi.fn(); render(<StaffTicketQueue user={user} onOpen={open} />);
    await screen.findByText('21 matching tickets');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes('page=2'))).toBe(true));
    const before = fetch.mock.calls.length;
    fireEvent.change(screen.getByLabelText('Search tickets'), { target: { value: 'network' } });
    expect(fetch.mock.calls).toHaveLength(before);
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes('search=network') && url.includes('page=1'))).toBe(true));
    fireEvent.click(await screen.findByRole('link', { name: `${ticket.ticketNumber}: ${ticket.summary}` })); expect(open).toHaveBeenCalledWith(ticket.id);
  });
  it('replaces prior results with a safe failure and supports retry', async () => {
    let fail = false;
    mockApi(url => url.includes('/staff/tickets?') && fail ? json({ error: { message: 'Queue unavailable' } }, 500) : undefined);
    render(<StaffTicketQueue user={user} onOpen={() => {}} />); await screen.findByText('1 matching tickets'); fail = true;
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    expect(await screen.findByRole('heading', { name: 'Unable to load tickets' })).toBeInTheDocument(); expect(screen.queryByText(ticket.ticketNumber)).not.toBeInTheDocument();
    fail = false; fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true })); await screen.findByText('1 matching tickets');
  });
  it('distinguishes empty from filtered no-results and hides Admin owner lookup', async () => {
    const fetch = mockApi(url => url.includes('/staff/tickets?') ? json(page()) : undefined);
    render(<StaffTicketQueue user={{ ...user, role: 'ADMINISTRATOR' }} onOpen={() => {}} />);
    await screen.findByText('No tickets yet');
    fireEvent.change(screen.getByLabelText('Search tickets'), { target: { value: 'missing' } }); fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    await screen.findByText('No matching tickets'); expect(fetch.mock.calls.some(([url]) => url.endsWith('/eligible-owners'))).toBe(false);
  });
});
describe('UI-05 operational detail', () => {
  it('requires confirmation before reassignment and sends the displayed version', async () => {
    const fetch = mockApi(); render(<StaffTicketDetail user={user} ticketId={ticket.id} onBack={() => {}} />);
    fireEvent.change(await screen.findByLabelText('Assign to'), { target: { value: user.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign / Reassign' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Unassigned to Alex Staff');
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm', exact: true }));
    await waitFor(() => expect(fetch.mock.calls.some(([, init]) => init?.body === JSON.stringify({ ownerId: user.id, confirmed: true, expectedVersion: 4 }))).toBe(true));
  });
  it('preserves attempted priority on conflict and prevents repeated writes until reload', async () => {
    const fetch = mockApi((url, init) => init?.method === 'PATCH' ? json({ error: { code: 'TICKET_CONFLICT', message: 'This ticket changed.' } }, 409) : undefined);
    render(<StaffTicketDetail user={user} ticketId={ticket.id} onBack={() => {}} />);
    fireEvent.change(await screen.findByLabelText('IT Priority'), { target: { value: 'LOW' } }); fireEvent.click(screen.getByRole('button', { name: 'Save priority' }));
    await screen.findByRole('button', { name: 'Reload latest details' });
    expect(screen.getByLabelText('IT Priority')).toHaveValue('LOW'); expect(screen.getByRole('button', { name: 'Save priority' })).toBeDisabled();
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Reload latest details' })); await waitFor(() => expect(screen.getByLabelText('IT Priority')).toHaveValue('HIGH'));
  });
  it('exposes only priority editing for Admin, retaining both conversation views', async () => {
    mockApi(); render(<StaffTicketDetail user={{ ...user, role: 'ADMINISTRATOR' }} ticketId={ticket.id} onBack={() => {}} />);
    await screen.findByLabelText('IT Priority');
    expect(screen.queryByRole('button', { name: 'Claim ticket' })).not.toBeInTheDocument(); expect(screen.queryByLabelText('Assign to')).not.toBeInTheDocument(); expect(screen.queryByLabelText('Next status')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Internal Notes/ })).toBeInTheDocument(); expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('shows terminal history with only the closed-ticket reopen exception', async () => {
    mockApi(url => url.endsWith(`/staff/tickets/${ticket.id}`) ? json({ data: { ...ticket, currentStatus: 'CLOSED' } }) : undefined);
    render(<StaffTicketDetail user={user} ticketId={ticket.id} onBack={() => {}} />);
    await screen.findByLabelText('Next status'); expect(screen.getByRole('option', { name: 'Reopened' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Claim ticket' })).not.toBeInTheDocument(); expect(screen.getByLabelText('IT Priority')).toBeDisabled(); expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
describe('UI-06 separate conversation drafts', () => {
  it('keeps private drafts separate, escapes entry HTML and supports keyboard tabs', async () => {
    mockApi(url => url.includes('/comments?') ? json(page([{ id: '1', author: { name: 'Jennifer', role: 'REQUESTER' }, createdAt: ticket.ticketDate, content: '<script>privateAttack()</script>' }])) : undefined);
    render(<TicketConversation ticketId={ticket.id} role="IT_STAFF" terminal={false} />);
    await screen.findByText('<script>privateAttack()</script>'); expect(document.querySelector('script')).toBeNull();
    fireEvent.change(screen.getByLabelText('Public comment'), { target: { value: 'Public draft' } });
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Public Comments' }), { key: 'ArrowRight' });
    expect(screen.getByLabelText('Internal note')).toHaveValue(''); expect(screen.getByText(/Internal — visible only/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Internal note'), { target: { value: 'Private draft' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Public Comments' })); expect(screen.getByLabelText('Public comment')).toHaveValue('Public draft');
    fireEvent.click(screen.getByRole('tab', { name: /Internal Notes/ })); expect(screen.getByLabelText('Internal note')).toHaveValue('Private draft');
  });
  it('retains a failed draft, reloads history, and never automatically replays a post', async () => {
    const fetch = mockApi((_url, init) => init?.method === 'POST' ? json({ error: { message: 'Connection interrupted' } }, 500) : undefined);
    render(<TicketConversation ticketId={ticket.id} role="IT_STAFF" terminal={false} />);
    await screen.findByText('No public comments yet.');
    fireEvent.change(screen.getByLabelText('Public comment'), { target: { value: 'Retain this message' } }); fireEvent.click(screen.getByRole('button', { name: 'Post public comment' }));
    await screen.findByText(/Your draft is retained/);
    expect(screen.getByLabelText('Public comment')).toHaveValue('Retain this message');
    await waitFor(() => expect(fetch.mock.calls.filter(([, init]) => init?.method === 'GET')).toHaveLength(2));
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });
});
describe('UI-07 Requester continuation', () => {
  it('only requests public entries and confirms apparent resolution without changing status locally', async () => {
    const fetch = mockApi(); const updated = vi.fn(); render(<RequesterWorkflow ticket={ticket} onUpdated={updated} />);
    await screen.findByText('No public comments yet.'); expect(screen.queryByText(/Internal Notes/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Problem appears resolved' }));
    const dialog = screen.getByRole('dialog'); expect(dialog).toHaveTextContent('does not change the ticket status');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' })); await waitFor(() => expect(updated).toHaveBeenCalledOnce());
    expect(fetch.mock.calls.some(([url]) => url.includes('internal-notes'))).toBe(false);
  });
  it('shows a previous indication and removes the repeat action', () => {
    mockApi(); render(<RequesterWorkflow ticket={{ ...ticket, requesterResolvedAt: ticket.ticketDate }} onUpdated={() => {}} />);
    expect(screen.getByText(/You reported this problem appears resolved/)).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Problem appears resolved' })).not.toBeInTheDocument();
  });
});
