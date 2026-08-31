/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App, { REQUESTER_STORAGE_KEY } from '../../src/App';
import { CREATE_TICKET_PENDING_KEY } from '../../src/CreateTicket';

const requester = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.test',
};
const categories = [
  { id: 1, name: 'Account and Access' },
  { id: 2, name: 'Hardware' },
];
const relatedSystems = [
  { id: 1, name: 'Email and Collaboration' },
  { id: 2, name: 'VPN' },
];

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const ticketResponse = {
  data: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ticketNumber: 'TKT-20260831-A1B2C3D4',
    ticketDate: '2026-08-31T12:00:00.000Z',
    requester,
    category: categories[0],
    relatedSystem: relatedSystems[1],
    summary: 'VPN disconnects after sign-in',
    requestedPriority: 'HIGH',
    itPriority: null,
    description: 'The VPN disconnects shortly after sign-in.',
    currentStatus: 'NEW',
    attachments: [],
    updatedAt: '2026-08-31T12:00:00.000Z',
  },
};

const referenceResponse = (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.endsWith('/api/categories')) return jsonResponse(categories);
  if (url.endsWith('/api/related-systems')) return jsonResponse(relatedSystems);
  throw new Error(`Unexpected reference URL: ${url}`);
};

const renderCreateTicket = () => {
  window.localStorage.setItem(REQUESTER_STORAGE_KEY, JSON.stringify(requester));
  window.history.replaceState({}, '', '/tickets/new');
  return render(<App />);
};

const fillValidForm = async () => {
  fireEvent.change(await screen.findByLabelText(/^Category/), {
    target: { value: '1' },
  });
  fireEvent.change(screen.getByLabelText(/^Related System/), {
    target: { value: '2' },
  });
  fireEvent.change(screen.getByLabelText(/^Requested Priority/), {
    target: { value: 'HIGH' },
  });
  fireEvent.change(screen.getByLabelText(/^Summary/), {
    target: { value: 'VPN disconnects after sign-in' },
  });
  fireEvent.change(screen.getByLabelText(/^Description/), {
    target: { value: 'The VPN disconnects shortly after sign-in.' },
  });
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Create Ticket', () => {
  it('disables Submit while references load, then enables validation guidance', async () => {
    let resolveCategories!: (response: Response) => void;
    let resolveSystems!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveCategories = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveSystems = resolve;
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    renderCreateTicket();

    expect(screen.getByRole('heading', { name: 'Create Ticket' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Ticket' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Loading reference data');

    await act(async () => {
      resolveCategories(jsonResponse(categories));
      resolveSystems(jsonResponse(relatedSystems));
    });

    expect(await screen.findByRole('option', { name: 'Hardware' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'VPN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Ticket' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please correct the highlighted fields',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows a safe reference failure and Retry preserves entered text', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ private: 'database password' }, 500))
      .mockResolvedValueOnce(jsonResponse(relatedSystems))
      .mockResolvedValueOnce(jsonResponse(categories))
      .mockResolvedValueOnce(jsonResponse(relatedSystems));
    vi.stubGlobal('fetch', fetchMock);

    renderCreateTicket();
    fireEvent.change(await screen.findByLabelText(/^Summary/), {
      target: { value: 'Keep this entered summary' },
    });

    const alert = await screen.findByText('Reference data could not be loaded. Try again.');
    expect(alert).toHaveTextContent('Reference data could not be loaded');
    expect(alert).not.toHaveTextContent(/database|password|private/i);
    fireEvent.click(screen.getByRole('button', { name: 'Retry reference data' }));

    expect(await screen.findByRole('option', { name: 'Hardware' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Summary/)).toHaveValue('Keep this entered summary');
  });

  it('rejects an invalid attachment selection before creating a Ticket', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) =>
      Promise.resolve(referenceResponse(input)),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderCreateTicket();
    await fillValidForm();
    const unsafeFile = new File(['unsafe'], 'evidence.exe', {
      type: 'application/octet-stream',
    });
    fireEvent.change(
      screen.getByLabelText('Attachments', { selector: 'input' }),
      { target: { files: [unsafeFile] } },
    );

    expect(screen.getByText('Selected: 1 / 5')).toBeInTheDocument();
    expect(screen.getByText('evidence.exe')).toBeInTheDocument();
    expect(screen.getByText(/Attachments must be JPG/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Clear selected files' }));
    expect(screen.getByText('Selected: 0 / 5')).toBeInTheDocument();
    expect(screen.queryByText('evidence.exe')).not.toBeInTheDocument();
  });

  it('prevents duplicate submits and shows official saved values on success', async () => {
    let resolveCreate!: (response: Response) => void;
    const createPromise = new Promise<Response>((resolve) => {
      resolveCreate = resolve;
    });
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return createPromise;
      return Promise.resolve(referenceResponse(input));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderCreateTicket();
    await fillValidForm();
    const submit = screen.getByRole('button', { name: 'Submit Ticket' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled();
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST'),
    ).toHaveLength(1);
    expect(window.sessionStorage.getItem(CREATE_TICKET_PENDING_KEY)).toContain(
      'idempotencyKey',
    );

    await act(async () => {
      resolveCreate(jsonResponse(ticketResponse, 201));
    });

    expect(
      await screen.findByRole('heading', { name: 'Ticket created' }),
    ).toBeInTheDocument();
    expect(screen.getByText('TKT-20260831-A1B2C3D4')).toBeInTheDocument();
    expect(screen.getByText('VPN disconnects after sign-in')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Ticket' })).toHaveAttribute(
      'href',
      '/tickets/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    expect(window.sessionStorage.getItem(CREATE_TICKET_PENDING_KEY)).toBeNull();
  });

  it('retains fields, valid files, and the idempotency key for a 5xx retry', async () => {
    const postKeys: string[] = [];
    let postCount = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        postKeys.push(new Headers(init.headers).get('Idempotency-Key') ?? '');
        postCount += 1;
        return Promise.resolve(
          postCount === 1
            ? jsonResponse({ error: { message: 'private SQL password' } }, 500)
            : jsonResponse(ticketResponse, 201),
        );
      }
      return Promise.resolve(referenceResponse(input));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderCreateTicket();
    await fillValidForm();
    const file = new File(['safe'], 'evidence.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Attachments', { selector: 'input' }), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Ticket could not be created');
    expect(alert).not.toHaveTextContent(/sql|password|private/i);
    expect(screen.getByLabelText(/^Summary/)).toHaveValue(
      'VPN disconnects after sign-in',
    );
    expect(screen.getByText('evidence.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));
    expect(
      await screen.findByRole('heading', { name: 'Ticket created' }),
    ).toBeInTheDocument();
    expect(postKeys).toHaveLength(2);
    expect(postKeys[0]).toBe(postKeys[1]);
  });

  it('rotates the pending key after a canonical field is edited', async () => {
    const postKeys: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        postKeys.push(new Headers(init.headers).get('Idempotency-Key') ?? '');
        return Promise.resolve(
          postKeys.length === 1
            ? jsonResponse({ error: { code: 'TICKET_CREATE_FAILED' } }, 500)
            : jsonResponse(
                {
                  data: {
                    ...ticketResponse.data,
                    summary: 'VPN disconnects after reconnecting',
                  },
                },
                201,
              ),
        );
      }
      return Promise.resolve(referenceResponse(input));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderCreateTicket();
    await fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));
    await screen.findByText('Ticket could not be created. Try again.');

    fireEvent.change(screen.getByLabelText(/^Summary/), {
      target: { value: 'VPN disconnects after reconnecting' },
    });
    expect(window.sessionStorage.getItem(CREATE_TICKET_PENDING_KEY)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    expect(
      await screen.findByRole('heading', { name: 'Ticket created' }),
    ).toBeInTheDocument();
    expect(postKeys).toHaveLength(2);
    expect(postKeys[0]).not.toBe(postKeys[1]);
  });
});
