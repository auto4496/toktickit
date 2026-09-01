/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App, { REQUESTER_STORAGE_KEY } from '../../src/App';

const requester = { id: '44444444-4444-4444-8444-444444444444', name: 'Jennifer Anderson', email: 'jennifer.anderson@example.test' };
const ticketId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const attachment = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', ticketId, originalName: 'vpn-error.png', mimeType: 'image/png', sizeBytes: 248120, uploadedAt: '2026-09-01T10:00:00.000Z', removedAt: null, removalReason: null, canDownload: true };
const detail = { id: ticketId, ticketNumber: 'TKT-20260901-A1B2C3D4', ticketDate: '2026-09-01T10:00:00.000Z', requester, category: { id: 4, name: 'Network' }, relatedSystem: { id: 2, name: 'VPN' }, summary: 'VPN disconnects after sign-in', requestedPriority: 'HIGH', itPriority: null, description: 'The VPN disconnects shortly after sign-in.', currentStatus: 'NEW', attachments: [attachment], updatedAt: '2026-09-01T10:05:00.000Z' };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => { window.localStorage.clear(); window.history.replaceState({}, '', `/tickets/${ticketId}`); window.localStorage.setItem(REQUESTER_STORAGE_KEY, JSON.stringify(requester)); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Requester Ticket Detail', () => {
  it('renders owned read-only detail and Attachment actions without a Preview control', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response({ data: detail }))));
    render(<App />);
    expect(await screen.findByRole('heading', { name: detail.summary })).toBeInTheDocument();
    expect(screen.getByText('Not assigned')).toBeInTheDocument();
    expect(screen.getByText('vpn-error.png')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /preview/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /preview/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Add Attachment')).toBeInTheDocument();
  });

  it('shows the same safe not-found UI for a non-owned detail', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response({ error: { code: 'RESOURCE_NOT_FOUND' } }, 404))));
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Ticket not found' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to My Tickets' })).toBeInTheDocument();
  });

  it('keeps server detail out of a safe retry failure message', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response({ error: { message: 'SQL at C:\\private' } }, 500))));
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Ticket details unavailable' })).toBeInTheDocument();
    expect(screen.getByText('Ticket details could not be loaded. Try again.')).toBeInTheDocument();
    expect(screen.queryByText(/SQL at/i)).not.toBeInTheDocument();
  });

  it('opens a named removal dialog and closes it with Escape', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response({ data: detail }))));
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    expect(screen.getByRole('dialog', { name: 'Remove vpn-error.png?' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
