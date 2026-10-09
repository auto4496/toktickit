/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../../src/Dashboard';
import { ApiFailure, workflow } from '../../src/workflow-api';

vi.mock('../../src/workflow-api', async importOriginal => ({ ...(await importOriginal<typeof import('../../src/workflow-api')>()), workflow: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const user = { id: '11111111-1111-4111-8111-111111111111', name: 'Requester', email: 'r@example.test', role: 'REQUESTER' as const, isActive: true, mustChangePassword: false, version: 1, createdAt: '', updatedAt: '' };
describe('Requester dashboard', () => {
  it('shows owned metrics, recent details and a filtered waiting drill-down', async () => {
    vi.mocked(workflow).mockResolvedValue({ asOf: '2026-10-04T10:00:00.000Z', windowStart: '2026-09-27T10:00:00.000Z', metrics: { open: 3, waitingForRequester: 1, recentlyUpdated: 2, recentlyResolved: 1 }, recentTickets: [{ id: 'ticket-1', ticketNumber: 'TKT-1', summary: 'VPN', currentStatus: 'WAITING_FOR_REQUESTER', updatedAt: '2026-10-04T09:00:00.000Z', href: '/tickets/ticket-1' }] });
    const onNavigate = vi.fn(); render(<Dashboard user={user} onNavigate={onNavigate} />);
    expect(await screen.findByText('Waiting for you')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Waiting for you/ })).toHaveTextContent('1');
    expect(screen.getByRole('link', { name: /Open tickets/ })).toHaveAttribute('href', '/tickets?status=open');
    expect(screen.getByRole('link', { name: /Recently updated/ })).toHaveAttribute('href', '/tickets?sortBy=updatedAt&sortDirection=desc');
    expect(screen.getByRole('link', { name: /Recently resolved/ })).toHaveAttribute('href', '/tickets?currentStatus=RESOLVED');
    expect(screen.getByRole('link', { name: /TKT-1: VPN/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Waiting for you/ }));
    expect(onNavigate).toHaveBeenCalledWith('/tickets?currentStatus=WAITING_FOR_REQUESTER');
    expect(vi.mocked(workflow)).toHaveBeenCalledWith('/dashboard/requester');
  });
  it('announces loading then a role failure without displaying protected metrics', async () => {
    let reject!: (error: Error) => void;
    vi.mocked(workflow).mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
    render(<Dashboard user={user} onNavigate={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading dashboard');
    act(() => reject(new ApiFailure('private message', 403, 'FORBIDDEN')));
    expect(await screen.findByRole('alert')).toHaveTextContent('not available for your role');
    expect(screen.queryByRole('link', { name: /Open tickets/ })).not.toBeInTheDocument();
  });
  it('shows a safe retry state after a failed request', async () => {
    vi.mocked(workflow).mockRejectedValueOnce(new Error('private database path')).mockResolvedValueOnce({ asOf: '2026-10-04T10:00:00.000Z', windowStart: '2026-09-27T10:00:00.000Z', metrics: { open: 0, waitingForRequester: 0, recentlyUpdated: 0, recentlyResolved: 0 }, recentTickets: [] });
    render(<Dashboard user={user} onNavigate={vi.fn()} />);
    expect(await screen.findByRole('alert')).not.toHaveTextContent('private database path');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No tickets were updated in the last seven days.')).toBeInTheDocument();
  });
});
