/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StaffTicketDetail from '../../src/StaffTicketDetail';
import { ApiFailure, workflow, WorkflowTicket } from '../../src/workflow-api';
import { AuthUser } from '../../src/auth-api';

vi.mock('../../src/workflow-api', async original => ({ ...await original<typeof import('../../src/workflow-api')>(), workflow: vi.fn() }));
const user: AuthUser = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Alex Staff', email: 'alex@example.test', role: 'IT_STAFF', mustChangePassword: false };
const ticket: WorkflowTicket = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', ticketNumber: 'TKT-TEST-GATE', ticketDate: '2026-10-07T01:00:00Z', summary: 'Resolve the connection', description: 'Synthetic workflow fixture', requester: { id: 'requester', name: 'Requester', email: 'requester@example.test' }, owner: { id: user.id, name: user.name, role: user.role, isActive: true }, category: { id: 1, name: 'Network' }, relatedSystem: { id: 1, name: 'VPN' }, requestedPriority: 'MEDIUM', itPriority: 'HIGH', currentStatus: 'IN_PROGRESS', version: 4, requesterResolvedAt: null, updatedAt: '2026-10-07T01:00:00Z', attachments: [], resolutionGate: { ready: true, unfinished: 0, completedWithResult: 1 } };
const empty = { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };
const person = { id: user.id, name: user.name, role: user.role, isActive: true };
function read(path: string, value = ticket) {
  return path.endsWith('/eligible-owners') || path.endsWith('/eligible-assignees') ? { data: [person] } : path.includes('?page=') ? empty : { data: value };
}
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const display = () => render(<StaffTicketDetail user={user} ticketId={ticket.id} onBack={() => {}} />);
const confirmResolve = async () => {
  fireEvent.change(await screen.findByLabelText('Next status'), { target: { value: 'RESOLVED' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirm', exact: true })); });
};

describe('UI-04 server resolution readiness', () => {
  it.each([{ ready: false, unfinished: 0, completedWithResult: 0 }, { ready: false, unfinished: 2, completedWithResult: 1 }, undefined])('disables Resolve for unavailable or incomplete readiness %#, even on a synthetic submit', async resolutionGate => {
    vi.mocked(workflow).mockImplementation(async path => read(path, { ...ticket, resolutionGate }));
    display(); await screen.findByLabelText('Next status');
    expect(screen.getByRole('option', { name: 'Resolved', exact: true })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Next status'), { target: { value: 'RESOLVED' } });
    expect(screen.getByRole('button', { name: 'Update status' })).toBeDisabled();
    fireEvent.submit(screen.getByLabelText('Next status').closest('form')!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(vi.mocked(workflow).mock.calls.filter(([, method]) => method === 'PATCH')).toHaveLength(0);
  });
  it('confirms once, prevents duplicate writes and refreshes status/version on success', async () => {
    let finish!: (value: unknown) => void;
    vi.mocked(workflow).mockImplementation(async (path, method, body) => {
      if (method === 'PATCH') {
        expect(body).toEqual({ currentStatus: 'RESOLVED', confirmed: true, expectedVersion: 4 });
        return new Promise(resolve => { finish = resolve; });
      }
      return read(path);
    });
    display(); await confirmResolve();
    const pending = screen.getByRole('button', { name: 'Updating…' });
    expect(pending).toBeDisabled(); fireEvent.submit(pending.closest('form')!);
    expect(vi.mocked(workflow).mock.calls.filter(([, method]) => method === 'PATCH')).toHaveLength(1);
    await act(async () => { finish({ data: { ...ticket, currentStatus: 'RESOLVED', version: 5 } }); });
    await screen.findByText('Ticket updated.'); expect(screen.getByText('Resolved', { selector: '.wf-heading .wf-badge' })).toBeInTheDocument();
  });
  it('refreshes a server gate rejection without losing the selected status and permits a later readiness retry', async () => {
    let current = ticket;
    vi.mocked(workflow).mockImplementation(async (path, method) => {
      if (method === 'PATCH') { current = { ...ticket, resolutionGate: { ready: false, unfinished: 1, completedWithResult: 1 } }; throw new ApiFailure('Unfinished Actions remain.', 409, 'ACTIONS_INCOMPLETE'); }
      return read(path, current);
    });
    display(); await confirmResolve();
    const feedback = await screen.findByText('Unfinished Actions remain.');
    expect(feedback).toHaveFocus(); expect(screen.getByLabelText('Next status')).toHaveValue('RESOLVED');
    expect(screen.getByRole('button', { name: 'Update status' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Reload latest details' })).not.toBeInTheDocument();
    current = ticket; fireEvent.click(screen.getByRole('button', { name: 'Retry readiness' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Update status' })).toBeEnabled());
  });
  it('blocks Resolve after readiness refresh fails and recovers on explicit retry', async () => {
    let fail = false;
    vi.mocked(workflow).mockImplementation(async path => {
      if (path.endsWith(`/staff/tickets/${ticket.id}`) && fail) throw new Error('Private failure');
      return read(path);
    });
    display(); await screen.findByLabelText('Next status'); fail = true;
    fireEvent.click(screen.getByRole('button', { name: 'Retry readiness' }));
    expect(await screen.findByText(/Resolution readiness could not be refreshed/)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Resolved', exact: true })).toBeDisabled();
    expect(screen.queryByText(/Private failure/)).not.toBeInTheDocument();
    fail = false; fireEvent.click(screen.getByRole('button', { name: 'Retry readiness' }));
    await waitFor(() => expect(screen.getByRole('option', { name: 'Resolved', exact: true })).toBeEnabled());
  });
  it('refreshes readiness through the actual Actions create callback and preserves priority draft', async () => {
    let current = ticket;
    const saved = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', ticketId: ticket.id, actionAt: ticket.ticketDate, description: 'New unfinished Action', result: '', assignedTo: person, createdBy: person, performedBy: person, followUpRequired: false, followUpNote: '', attachmentNotes: '', status: 'PLANNED', version: 1, createdAt: ticket.ticketDate, updatedAt: ticket.ticketDate };
    vi.mocked(workflow).mockImplementation(async (path, method) => {
      if (method === 'POST') { current = { ...ticket, resolutionGate: { ready: false, unfinished: 1, completedWithResult: 1 } }; return { data: saved }; }
      if (path.endsWith(`/actions/${saved.id}`)) return { data: saved, revisions: [] };
      return read(path, current);
    });
    display(); fireEvent.change(await screen.findByLabelText('IT Priority'), { target: { value: 'LOW' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Add Action' }));
    fireEvent.change(screen.getByLabelText('Action Description'), { target: { value: saved.description } });
    fireEvent.change(screen.getByLabelText('Assigned to'), { target: { value: user.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Action' }));
    await screen.findByText('Action saved.');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Resolved', exact: true })).toBeDisabled());
    expect(screen.getByLabelText('IT Priority')).toHaveValue('LOW');
    expect(screen.getByText(/unfinished: 1/)).toBeInTheDocument();
  });
  it('keeps Admin status controls unavailable even when Actions are ready', async () => {
    vi.mocked(workflow).mockImplementation(async path => read(path));
    render(<StaffTicketDetail user={{ ...user, role: 'ADMINISTRATOR' }} ticketId={ticket.id} onBack={() => {}} />);
    await screen.findByText('Ticket oversight'); expect(screen.queryByLabelText('Next status')).not.toBeInTheDocument();
  });
  it('requires explicit reload after an ambiguous status response and retains the attempted status', async () => {
    vi.mocked(workflow).mockImplementation(async (path, method) => {
      if (method === 'PATCH') throw new TypeError('Network failure after potential commit');
      return read(path);
    });
    display(); await confirmResolve(); await screen.findByRole('button', { name: 'Reload latest details' });
    expect(screen.getByLabelText('Next status')).toHaveValue('RESOLVED');
    expect(screen.getByRole('button', { name: 'Update status' })).toBeDisabled();
    expect(vi.mocked(workflow).mock.calls.filter(([, method]) => method === 'PATCH')).toHaveLength(1);
  });
});
