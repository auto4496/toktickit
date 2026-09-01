/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App, { REQUESTER_STORAGE_KEY } from '../../src/App';

const requesters = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Jennifer Anderson',
    email: 'jennifer.anderson@example.test',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Michael Chen',
    email: 'michael.chen@example.test',
  },
];

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  window.history.replaceState({}, '', '/tickets');
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Development Requester context', () => {
  it('guards requester routes and loads the active Requester selector', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(requesters));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Select Development Requester' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading requesters');

    expect(
      await screen.findByRole('option', { name: /Jennifer Anderson/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/testing mechanism, not authentication/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/requesters$/);
  });

  it('stores the selected Requester, shows the shell, and clears it on Change Requester', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(requesters))),
    );

    render(<App />);

    const selector = await screen.findByLabelText('Development Requester');
    fireEvent.change(selector, { target: { value: requesters[0].id } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Jennifer Anderson')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Tickets' })).toBeInTheDocument();
    expect(window.localStorage.getItem(REQUESTER_STORAGE_KEY)).toContain(
      requesters[0].id,
    );

    const changeRequester = screen.getByRole('button', { name: 'Change Requester' });
    expect(changeRequester.closest('.requester-chip')).toBeInTheDocument();

    fireEvent.click(changeRequester);

    expect(
      screen.getByRole('heading', { name: 'Select Development Requester' }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(REQUESTER_STORAGE_KEY)).toBeNull();
    expect(
      await screen.findByRole('option', { name: /Jennifer Anderson/ }),
    ).toBeInTheDocument();
  });

  it('restores a persisted Requester in a fresh App mount', async () => {
    window.localStorage.setItem(REQUESTER_STORAGE_KEY, JSON.stringify(requesters[1]));
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/categories')) return Promise.resolve(jsonResponse([]));
      if (url.includes('/api/tickets?')) {
        return Promise.resolve(
          jsonResponse({
            data: [],
            meta: {
              page: 1,
              pageSize: 10,
              totalItems: 0,
              totalPages: 0,
              sortBy: 'updatedAt',
              sortDirection: 'desc',
            },
          }),
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(screen.getByText('Michael Chen')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Tickets' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Select Development Requester' }),
    ).not.toBeInTheDocument();
    await screen.findByRole('heading', { name: 'You have not created any tickets yet' });
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).endsWith('/api/requesters')),
    ).toBe(false);
  });

  it('shows the empty state and supports Retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(requesters));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(
      await screen.findByText('No active Development Requesters are available'),
    ).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'Retry' });
    expect(retry.closest('.state-panel')).toBeInTheDocument();
    fireEvent.click(retry);

    expect(
      await screen.findByRole('option', { name: /Michael Chen/ }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows a safe failure with Retry and no server detail', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: 'password=secret; database private_table' }, 500),
      )
      .mockResolvedValueOnce(jsonResponse(requesters));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to load Development Requesters');
    expect(alert).not.toHaveTextContent(/password|secret|database|private_table/i);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByRole('option', { name: /Jennifer Anderson/ }),
    ).toBeInTheDocument();
  });
});
