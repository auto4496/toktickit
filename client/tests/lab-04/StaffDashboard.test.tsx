/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../../src/Dashboard';
import { workflow } from '../../src/workflow-api';

vi.mock('../../src/workflow-api', async importOriginal => ({ ...(await importOriginal<typeof import('../../src/workflow-api')>()), workflow: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const user = { id: '22222222-2222-4222-8222-222222222222', name: 'Staff', email: 's@example.test', role: 'IT_STAFF' as const, isActive: true, mustChangePassword: false, version: 1, createdAt: '', updatedAt: '' };
describe('Staff dashboard', () => {
  it('shows operational counts and drills into follow-up Tickets', async () => {
    vi.mocked(workflow).mockResolvedValue({ asOf: '2026-10-04T10:00:00.000Z', windowStart: '2026-09-27T10:00:00.000Z', metrics: { unassigned: 4, myOwned: 2, myFollowUps: 3, byStatus: { NEW: 1, OPEN: 2 }, byPriority: { LOW: 0, MEDIUM: 1, HIGH: 2 } }, recentTickets: [] });
    const onNavigate = vi.fn(); render(<Dashboard user={user} onNavigate={onNavigate} />);
    expect(await screen.findByText('Your follow-up Actions')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Your follow-up Actions/ }));
    expect(onNavigate).toHaveBeenCalledWith('/staff/tickets?actionAssignee=me');
    expect(screen.getByRole('link', { name: /High/ })).toHaveTextContent('2');
    expect(vi.mocked(workflow)).toHaveBeenCalledWith('/dashboard/staff');
  });
  it('shows an empty state and recovers from a failed request', async () => {
    vi.mocked(workflow).mockRejectedValueOnce(new Error('temporary failure')).mockResolvedValueOnce({ asOf: '2026-10-04T10:00:00.000Z', windowStart: '2026-09-27T10:00:00.000Z', metrics: { unassigned: 0, myOwned: 0, myFollowUps: 0, byStatus: { NEW: 0 }, byPriority: { LOW: 0 } }, recentTickets: [] });
    render(<Dashboard user={user} onNavigate={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Dashboard information could not be loaded');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No tickets were updated in the last seven days.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Unassigned tickets/ })).toHaveTextContent('0');
  });
});
