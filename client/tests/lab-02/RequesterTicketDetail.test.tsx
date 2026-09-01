/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('traps Tab in the removal dialog and restores focus after Cancel', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response({ data: detail }))));
    render(<App />);
    const remove = await screen.findByRole('button', { name: 'Remove' });
    fireEvent.click(remove);
    const dialog = screen.getByRole('dialog');
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
    cancel.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(screen.getByLabelText('Removal reason')).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(cancel).toHaveFocus();
    fireEvent.click(cancel);
    await waitFor(() => expect(remove).toHaveFocus());
  });

  it('shows an uploading row, disables duplicate selection, and adds the uploaded metadata', async () => {
    let resolveUpload!: (value: Response) => void;
    const uploadPromise = new Promise<Response>((resolve) => { resolveUpload = resolve; });
    const uploaded = { ...attachment, id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', originalName: 'new-evidence.png' };
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => init?.method === 'POST' ? uploadPromise : Promise.resolve(response({ data: detail })));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    const input = await screen.findByLabelText('Add Attachment');
    fireEvent.change(input, { target: { files: [new File(['png'], 'new-evidence.png', { type: 'image/png' })] } });
    expect(await screen.findByText('Uploading…')).toBeInTheDocument();
    expect(input).toBeDisabled();
    await act(async () => resolveUpload(response({ data: uploaded }, 201)));
    expect(await screen.findByText('new-evidence.png')).toBeInTheDocument();
    expect(screen.getByText('new-evidence.png uploaded.')).toBeInTheDocument();
    expect(input).toBeEnabled();
  });

  it('shows a specific invalid selection without sending it', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(response({ data: detail })));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Add Attachment'), { target: { files: [new File(['bad'], 'malware.exe', { type: 'application/octet-stream' })] } });
    expect(screen.getByText('malware.exe')).toBeInTheDocument();
    expect(screen.getByText(/Choose a JPG, PNG, WEBP, or PDF/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove selection' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps a safe failed upload row and retries it successfully', async () => {
    const uploaded = { ...attachment, id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', originalName: 'retry.png' };
    let uploads = 0;
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'POST') return Promise.resolve(response({ data: detail }));
      uploads += 1;
      return Promise.resolve(uploads === 1
        ? response({ error: { code: 'ATTACHMENT_UPLOAD_FAILED', message: 'C:\\private\\storage SQL password' } }, 500)
        : response({ data: uploaded }, 201));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Add Attachment'), { target: { files: [new File(['png'], 'retry.png', { type: 'image/png' })] } });
    expect(await screen.findByText('The Attachment could not be uploaded. Try again.')).toBeInTheDocument();
    expect(screen.queryByText(/private|storage SQL|password/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry Upload' }));
    expect(await screen.findByText('retry.png uploaded.')).toBeInTheDocument();
    expect(uploads).toBe(2);
  });

  it('keeps unavailable metadata with Retry Download and clears the state after success', async () => {
    let downloads = 0;
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.headers && !init.method) {
        const url = String(_input);
        if (url.includes('/download')) {
          downloads += 1;
          return Promise.resolve(downloads === 1
            ? response({ error: { code: 'ATTACHMENT_FILE_UNAVAILABLE', message: 'C:\\private\\file' } }, 404)
            : new Response(new Blob(['bytes']), { status: 200, headers: { 'Content-Type': 'image/png' } }));
        }
      }
      return Promise.resolve(response({ data: detail }));
    });
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Download' }));
    expect(await screen.findByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText('This file cannot be downloaded right now.')).toBeInTheDocument();
    expect(screen.queryByText(/private|file$/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry Download' }));
    await waitFor(() => expect(screen.queryByText('Unavailable')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });

  it('retains removed metadata and hides byte and removal actions', async () => {
    const removed = { ...attachment, removedAt: '2026-09-01T11:00:00.000Z', removalReason: 'Uploaded the wrong screenshot.', canDownload: false };
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => init?.method === 'DELETE' ? Promise.resolve(response({ data: removed })) : Promise.resolve(response({ data: detail })));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    fireEvent.change(screen.getByLabelText('Removal reason'), { target: { value: 'Uploaded the wrong screenshot.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Attachment' }));
    expect(await screen.findByText(/Removed .*Uploaded the wrong screenshot/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('uses safe ownership-failure feedback without exposing server detail', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => init?.method === 'POST'
      ? Promise.resolve(response({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Requester A private metadata' } }, 404))
      : Promise.resolve(response({ data: detail })));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Add Attachment'), { target: { files: [new File(['png'], 'owned.png', { type: 'image/png' })] } });
    expect(await screen.findByText('The requested Ticket is unavailable.')).toBeInTheDocument();
    expect(screen.queryByText(/Requester A private metadata/i)).not.toBeInTheDocument();
  });
});
