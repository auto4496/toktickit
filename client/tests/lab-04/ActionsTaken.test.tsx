/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ActionsTaken from '../../src/ActionsTaken';
import { ApiFailure, workflow } from '../../src/workflow-api';

vi.mock('../../src/workflow-api', async importOriginal => ({ ...(await importOriginal<typeof import('../../src/workflow-api')>()), workflow: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const ticketId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const staff = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Alex' };
const action = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', ticketId, actionAt: '2026-10-04T09:00:00.000Z', description: 'Check VPN', result: '', assignedTo: staff, createdBy: staff, performedBy: staff, followUpRequired: true, followUpNote: 'Ask for logs', attachmentNotes: 'vpn-log.txt', status: 'PLANNED', version: 1, createdAt: '2026-10-04T09:00:00.000Z', updatedAt: '2026-10-04T09:00:00.000Z' };
const list = { data: [action], meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } };
describe('Actions Taken', () => {
  it('shows an owned Requester a read-only Action and no revisions', async () => {
    vi.mocked(workflow).mockImplementation(async path => path.includes('?page=') ? list : { data: action });
    render(<ActionsTaken ticketId={ticketId} role="REQUESTER" terminal={false} />);
    fireEvent.click(await screen.findByRole('button', { name: 'View Action' }));
    expect(await screen.findByText('Attachment Notes')).toBeInTheDocument();
    expect(screen.getByText('vpn-log.txt')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Action' })).not.toBeInTheDocument();
    expect(screen.queryByText('Change history')).not.toBeInTheDocument();
  });
  it('lets Staff enter required follow-up details and sends a retry-safe create', async () => {
    vi.mocked(workflow).mockImplementation(async (path, method) => {
      if (path.endsWith('/eligible-assignees')) return { data: [staff] };
      if (method === 'POST') return { data: action };
      if (path.includes('?page=')) return { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };
      return { data: action, revisions: [] };
    });
    render(<ActionsTaken ticketId={ticketId} role="IT_STAFF" terminal={false} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add Action' }));
    fireEvent.change(screen.getByLabelText('Action Description'), { target: { value: 'Check VPN' } });
    fireEvent.change(screen.getByLabelText('Assigned to'), { target: { value: staff.id } });
    fireEvent.click(screen.getByLabelText('Follow-Up Required?'));
    fireEvent.change(screen.getByLabelText('Follow-up Note'), { target: { value: 'Ask for logs' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Action' }));
    await waitFor(() => expect(vi.mocked(workflow).mock.calls.some(([, method, , headers]) => method === 'POST' && typeof headers?.['Idempotency-Key'] === 'string')).toBe(true));
  });
});

const revisions = [{ id: 'revision-1', operation: 'CREATED', createdAt: action.createdAt, actor: staff, snapshot: { version: 1 } }];
const detail = (value = action) => ({ data: value, revisions });
const openAction = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'View Action' }));
  await waitFor(() => expect(screen.queryByText('Loading Action details…')).not.toBeInTheDocument());
};
const readMock = (path: string, value = action) => path.endsWith('/eligible-assignees') ? { data: [staff] } : path.includes('?page=') ? { ...list, data: [value] } : detail(value);

describe('UI-05 Start control and recovery', () => {
  it.each(['IT_STAFF', 'ADMINISTRATOR'] as const)('starts once for %s with busy protection, refreshed history/list and keyboard focus', async role => {
    let current = action;
    let finish!: (value: unknown) => void;
    vi.mocked(workflow).mockImplementation(async (path, method) => {
      if (method === 'PATCH') {
        return await new Promise(resolve => { finish = resolve; });
      }
      const value = readMock(path, current);
      return path.includes('?page=') || path.endsWith('/eligible-assignees') ? value : {
        ...detail(current), revisions: current.version === 2 ? [...revisions, { ...revisions[0], id: 'revision-2', operation: 'STARTED' }] : revisions,
      };
    });
    render(<ActionsTaken ticketId={ticketId} role={role} terminal={false} />);
    await openAction();
    const start = screen.getByRole('button', { name: 'Start', exact: true });
    start.focus(); fireEvent.click(start); fireEvent.click(start);
    expect(screen.getByRole('button', { name: 'Starting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit', exact: true })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Complete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel Action' })).toBeDisabled();
    expect(vi.mocked(workflow).mock.calls.filter(([, method]) => method === 'PATCH')).toHaveLength(1);
    expect(workflow).toHaveBeenCalledWith(`/tickets/${ticketId}/actions/${action.id}/status`, 'PATCH', { status: 'IN_PROGRESS', expectedVersion: 1 });
    current = { ...action, status: 'IN_PROGRESS', version: 2 };
    finish({ data: current });
    expect(await screen.findByText('Action started.')).toBeInTheDocument();
    expect(await screen.findByText(/Started by Alex/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start', exact: true })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { name: action.description })).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: /All Actions/ }));
    expect(await screen.findByText('In Progress')).toBeInTheDocument();
  });

  it.each([
    ['REQUESTER', 'PLANNED', false], ['REQUESTER', 'IN_PROGRESS', false],
    ['IT_STAFF', 'IN_PROGRESS', false], ['IT_STAFF', 'COMPLETED', false], ['IT_STAFF', 'CANCELLED', false],
    ['IT_STAFF', 'PLANNED', true], ['ADMINISTRATOR', 'PLANNED', true],
  ] as const)('hides Start for role %s, status %s, terminal Ticket %s', async (role, status, terminal) => {
    vi.mocked(workflow).mockImplementation(async path => readMock(path, { ...action, status }));
    render(<ActionsTaken ticketId={ticketId} role={role} terminal={terminal} />);
    await openAction();
    expect(screen.queryByRole('button', { name: 'Start', exact: true })).not.toBeInTheDocument();
    if (role === 'REQUESTER' || terminal || ['COMPLETED', 'CANCELLED'].includes(status)) {
      for (const name of ['Edit', 'Complete', 'Cancel Action', 'Add Action']) expect(screen.queryByRole('button', { name, exact: true })).not.toBeInTheDocument();
    }
    if (role === 'REQUESTER') expect(screen.queryByText('Change history')).not.toBeInTheDocument();
  });

  it('requires Reload latest after a stale Start and retries with the new version', async () => {
    let current = action, writes = 0;
    vi.mocked(workflow).mockImplementation(async (path, method, body) => {
      if (method === 'PATCH') {
        if (++writes === 1) { current = { ...action, version: 2 }; throw new ApiFailure('This Action changed. Reload the latest details before trying again.', 409, 'ACTION_CONFLICT'); }
        expect(body).toEqual({ status: 'IN_PROGRESS', expectedVersion: 2 });
        current = { ...action, status: 'IN_PROGRESS', version: 3 }; return { data: current };
      }
      return readMock(path, current);
    });
    render(<ActionsTaken ticketId={ticketId} role="IT_STAFF" terminal={false} />); await openAction();
    fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This Action changed');
    expect(screen.getByRole('button', { name: 'Start', exact: true })).toBeDisabled();
    expect(screen.getByText('Check VPN')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload latest' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start', exact: true })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
    expect(await screen.findByText('Action started.')).toBeInTheDocument(); expect(writes).toBe(2);
  });

  it('retains unsaved edit fields across a stale-version reload', async () => {
    let current = action, writes = 0;
    vi.mocked(workflow).mockImplementation(async (path, method, body) => {
      if (method === 'PATCH') {
        if (++writes === 1) { current = { ...action, version: 2 }; throw new ApiFailure('This Action changed.', 409, 'ACTION_CONFLICT'); }
        expect(body).toMatchObject({ description: 'My unsaved work', expectedVersion: 2 });
        current = { ...action, description: 'My unsaved work', version: 3 }; return { data: current };
      }
      return readMock(path, current);
    });
    render(<ActionsTaken ticketId={ticketId} role="IT_STAFF" terminal={false} />); await openAction();
    fireEvent.click(screen.getByRole('button', { name: 'Edit', exact: true }));
    fireEvent.change(screen.getByLabelText('Action Description'), { target: { value: 'My unsaved work' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Action' }));
    await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'Reload latest' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Action' })).toBeEnabled());
    expect(screen.getByLabelText('Action Description')).toHaveValue('My unsaved work');
    fireEvent.click(screen.getByRole('button', { name: 'Save Action' }));
    expect(await screen.findByText('Action saved.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'My unsaved work' })).toBeInTheDocument();
  });
  it('shows a safe list failure and retries to an empty state', async () => {
    let reads = 0;
    vi.mocked(workflow).mockImplementation(async () => {
      if (++reads === 1) throw new Error('Private server detail');
      return { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };
    });
    render(<ActionsTaken ticketId={ticketId} role="REQUESTER" terminal={false} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Actions Taken could not be loaded');
    expect(screen.queryByText(/Private server detail/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No Actions Taken have been recorded for this Ticket.')).toBeInTheDocument();
  });

  it('shows safe ambiguous-failure feedback and reloads before retrying Start', async () => {
    vi.mocked(workflow).mockImplementation(async (path, method) => {
      if (method === 'PATCH') throw new Error('Private database / credential detail');
      return readMock(path);
    });
    render(<ActionsTaken ticketId={ticketId} role="IT_STAFF" terminal={false} />); await openAction();
    fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
    expect(await screen.findByText('Action could not be updated. Reload latest before trying again.')).toBeInTheDocument();
    expect(screen.queryByText(/Private database/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start', exact: true })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reload latest' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start', exact: true })).toBeEnabled());
  });

  it('keeps a committed Start visible when history refresh fails and prevents another write until reload', async () => {
    let written = false;
    vi.mocked(workflow).mockImplementation(async (path, method) => {
      if (method === 'PATCH') { written = true; return { data: { ...action, status: 'IN_PROGRESS', version: 2 } }; }
      if (written && !path.includes('?page=') && !path.endsWith('/eligible-assignees')) throw new Error('Network unavailable');
      return readMock(path);
    });
    render(<ActionsTaken ticketId={ticketId} role="IT_STAFF" terminal={false} />); await openAction();
    fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
    expect(await screen.findByText(/Action saved, but its latest history/)).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start', exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reload latest' })).toBeEnabled();
  });
});
