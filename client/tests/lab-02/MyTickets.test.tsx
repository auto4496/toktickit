/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App, { REQUESTER_STORAGE_KEY } from '../../src/App';

const requesterA = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.test',
};
const requesterB = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Michael Chen',
  email: 'michael.chen@example.test',
};
const categories = [
  { id: 1, name: 'Account and Access' },
  { id: 4, name: 'Network' },
];
const ticket = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  ticketNumber: 'TKT-20260901-A1B2C3D4',
  ticketDate: '2026-09-01T10:00:00.000Z',
  summary: 'VPN disconnects after sign-in',
  category: categories[1],
  relatedSystem: { id: 2, name: 'VPN' },
  requestedPriority: 'HIGH',
  itPriority: null,
  currentStatus: 'NEW',
  updatedAt: '2026-09-01T10:05:00.000Z',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const ticketResponse = (
  data: typeof ticket[] = [ticket],
  overrides: Partial<{
    page: number;
    pageSize: 10 | 20 | 50;
    totalItems: number;
    totalPages: number;
    sortBy: 'createdAt' | 'updatedAt' | 'ticketNumber' | 'requestedPriority';
    sortDirection: 'asc' | 'desc';
  }> = {},
) => ({
  data,
  meta: {
    page: 1,
    pageSize: 10 as const,
    totalItems: data.length,
    totalPages: data.length > 0 ? 1 : 0,
    sortBy: 'updatedAt' as const,
    sortDirection: 'desc' as const,
    ...overrides,
  },
});

const renderMyTickets = () => {
  window.localStorage.setItem(REQUESTER_STORAGE_KEY, JSON.stringify(requesterA));
  window.history.replaceState({}, '', '/tickets');
  return render(<App />);
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState({}, '', '/tickets');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('My Tickets', () => {
  it('shows loading then an owned result in the desktop table and mobile card', async () => {
    let resolveTickets!: (response: Response) => void;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/categories')) return Promise.resolve(jsonResponse(categories));
      if (url.includes('/api/tickets?')) {
        return new Promise<Response>((resolve) => {
          resolveTickets = resolve;
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderMyTickets();

    expect(screen.getByRole('status')).toHaveTextContent('Loading your tickets');
    expect(screen.getByLabelText('Category')).toBeDisabled();

    await act(async () => {
      resolveTickets(jsonResponse(ticketResponse()));
    });

    expect(await screen.findByText('Showing 1–1 of 1 tickets')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText(ticket.ticketNumber)).toBeInTheDocument();
    expect(within(table).getByText(ticket.summary)).toHaveAttribute('title', ticket.summary);
    expect(within(table).getByText('Not assigned')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: `View Ticket ${ticket.ticketNumber}` })).toHaveLength(2);
    const statusBadges = screen.getAllByText('New', { selector: '.status-new' });
    expect(statusBadges).toHaveLength(2);
    for (const statusBadge of statusBadges) {
      expect(statusBadge).toHaveClass('ticket-badge', 'status-new');
    }

    const ticketCall = fetchMock.mock.calls.find(([input]) =>
      String(input).includes('/api/tickets?'),
    );
    expect(String(ticketCall?.[0])).toContain(
      'sortBy=updatedAt&sortDirection=desc&page=1&pageSize=10',
    );
    expect(new Headers(ticketCall?.[1]?.headers).get('X-Requester-Id')).toBe(
      requesterA.id,
    );
  });

  it('distinguishes first-use empty from filtered no-results and clears filters', async () => {
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/categories')) return Promise.resolve(jsonResponse(categories));
      requestedUrls.push(url);
      const parameters = new URL(url, 'http://localhost').searchParams;
      if (parameters.has('search')) {
        return Promise.resolve(jsonResponse(ticketResponse([])));
      }
      return Promise.resolve(jsonResponse(ticketResponse([])));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderMyTickets();

    const firstUseHeading = await screen.findByRole('heading', {
      name: 'You have not created any tickets yet',
    });
    expect(firstUseHeading.closest('[role="status"]')).toHaveAttribute(
      'aria-live',
      'polite',
    );

    fireEvent.change(screen.getByLabelText('Search tickets'), {
      target: { value: '  vpn  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    const noResultsHeading = await screen.findByRole('heading', {
      name: 'No tickets match these filters',
    });
    expect(noResultsHeading.closest('[role="status"]')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(requestedUrls.at(-1)).toContain('search=vpn');

    fireEvent.click(
      within(screen.getByRole('heading', { name: 'No tickets match these filters' }).parentElement!).getByRole(
        'button',
        { name: 'Clear Filters' },
      ),
    );
    expect(await screen.findByLabelText('Search tickets')).toHaveValue('');
    expect(
      await screen.findByRole('heading', {
        name: 'You have not created any tickets yet',
      }),
    ).toBeInTheDocument();
  });

  it('shows an announced out-of-range state without an inverted result range', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/categories')) return Promise.resolve(jsonResponse(categories));
      if (url.includes('/api/tickets?')) {
        return Promise.resolve(
          jsonResponse(ticketResponse([], {
            page: 99,
            totalItems: 12,
            totalPages: 2,
          })),
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderMyTickets();

    const outOfRangeHeading = await screen.findByRole('heading', {
      name: 'No tickets on this page',
    });
    expect(outOfRangeHeading.closest('[role="status"]')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(screen.queryByText(/Showing \d+–\d+ of 12 tickets/)).not.toBeInTheDocument();
    expect(screen.getByText('Page 99 of 2')).toBeInTheDocument();
  });

  it('generates documented filter and sort queries and resets page after page-size changes', async () => {
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/categories')) return Promise.resolve(jsonResponse(categories));
      requestedUrls.push(url);
      const parameters = new URL(url, 'http://localhost').searchParams;
      const page = Number(parameters.get('page'));
      const pageSize = Number(parameters.get('pageSize')) as 10 | 20 | 50;
      return Promise.resolve(
        jsonResponse(
          ticketResponse([ticket], {
            page,
            pageSize,
            totalItems: pageSize === 10 ? 11 : 1,
            totalPages: pageSize === 10 ? 2 : 1,
            sortBy: (parameters.get('sortBy') ?? 'updatedAt') as
              | 'createdAt'
              | 'updatedAt'
              | 'ticketNumber'
              | 'requestedPriority',
            sortDirection: (parameters.get('sortDirection') ?? 'desc') as
              | 'asc'
              | 'desc',
          }),
        ),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    renderMyTickets();
    await screen.findByText('Showing 1–1 of 11 tickets');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(requestedUrls.at(-1)).toContain('page=2'));

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Requested Priority'), {
      target: { value: 'HIGH' },
    });
    fireEvent.change(screen.getByLabelText('Current Status'), {
      target: { value: 'NEW' },
    });
    fireEvent.change(screen.getByLabelText('Sort by'), {
      target: { value: 'requestedPriority' },
    });
    fireEvent.change(screen.getByLabelText('Sort direction'), {
      target: { value: 'asc' },
    });
    fireEvent.change(screen.getByLabelText('Results per page'), {
      target: { value: '20' },
    });

    await waitFor(() => {
      const parameters = new URL(requestedUrls.at(-1)!, 'http://localhost').searchParams;
      expect(Object.fromEntries(parameters)).toMatchObject({
        categoryId: '4',
        requestedPriority: 'HIGH',
        currentStatus: 'NEW',
        sortBy: 'requestedPriority',
        sortDirection: 'asc',
        page: '1',
        pageSize: '20',
      });
    });
  });

  it('shows a safe failure and Retry keeps the current query controls', async () => {
    let filteredAttempts = 0;
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/categories')) return Promise.resolve(jsonResponse(categories));
      requestedUrls.push(url);
      if (url.includes('search=vpn')) {
        filteredAttempts += 1;
        if (filteredAttempts === 1) {
          return Promise.resolve(
            jsonResponse({ error: { message: 'password=secret private_table' } }, 500),
          );
        }
      }
      return Promise.resolve(jsonResponse(ticketResponse()));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderMyTickets();
    await screen.findByText('Showing 1–1 of 1 tickets');
    fireEvent.change(screen.getByLabelText('Search tickets'), {
      target: { value: 'vpn' },
    });
    fireEvent.change(screen.getByLabelText('Requested Priority'), {
      target: { value: 'HIGH' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Tickets could not be loaded');
    expect(alert).not.toHaveTextContent(/password|secret|private_table/i);
    expect(screen.getByLabelText('Search tickets')).toHaveValue('vpn');
    expect(screen.getByLabelText('Requested Priority')).toHaveValue('HIGH');

    fireEvent.click(screen.getByRole('button', { name: 'Retry Tickets' }));
    expect(await screen.findByText('Showing 1–1 of 1 tickets')).toBeInTheDocument();
    const filteredUrls = requestedUrls.filter((url) => url.includes('search=vpn'));
    expect(filteredUrls).toHaveLength(2);
    expect(filteredUrls[0]).toBe(filteredUrls[1]);
  });

  it('clears stale ticket data while changing Requester context', async () => {
    const requesterBTicket = {
      ...ticket,
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      ticketNumber: 'TKT-20260901-B1B2C3D4',
      summary: 'Michael owned Ticket',
    };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/categories')) return Promise.resolve(jsonResponse(categories));
      if (url.endsWith('/api/requesters')) {
        return Promise.resolve(jsonResponse([requesterA, requesterB]));
      }
      if (url.includes('/api/tickets?')) {
        const requesterId = new Headers(init?.headers).get('X-Requester-Id');
        return Promise.resolve(
          jsonResponse(
            ticketResponse(requesterId === requesterB.id ? [requesterBTicket] : [ticket]),
          ),
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderMyTickets();
    expect(await screen.findAllByText(ticket.ticketNumber)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Change Requester' }));

    expect(screen.queryByText(ticket.ticketNumber)).not.toBeInTheDocument();
    const selector = await screen.findByLabelText('Development Requester');
    fireEvent.change(selector, { target: { value: requesterB.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.queryByText(ticket.ticketNumber)).not.toBeInTheDocument();
    expect(await screen.findAllByText(requesterBTicket.ticketNumber)).toHaveLength(2);
    expect(screen.getAllByText('Tickets owned by Michael Chen')).toHaveLength(2);
  });
});
