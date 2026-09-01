import { describe, expect, it } from 'vitest';
import {
  comparePriorityTickets,
  parseTicketListQuery,
} from '../../src/ticket-query.js';

describe('Ticket list query parsing', () => {
  it('applies the documented defaults', () => {
    expect(parseTicketListQuery({})).toEqual({
      success: true,
      value: {
        sortBy: 'updatedAt',
        sortDirection: 'desc',
        page: 1,
        pageSize: 10,
      },
    });
  });

  it('trims search and accepts every documented query control', () => {
    expect(
      parseTicketListQuery({
        search: '  vpn disconnect  ',
        categoryId: '42',
        requestedPriority: 'HIGH',
        currentStatus: 'NEW',
        sortBy: 'ticketNumber',
        sortDirection: 'asc',
        page: '2',
        pageSize: '20',
      }),
    ).toEqual({
      success: true,
      value: {
        search: 'vpn disconnect',
        categoryId: 42,
        requestedPriority: 'HIGH',
        currentStatus: 'NEW',
        sortBy: 'ticketNumber',
        sortDirection: 'asc',
        page: 2,
        pageSize: 20,
      },
    });
  });

  it.each([
    [{ search: '   ' }, 'search'],
    [{ search: 'x'.repeat(101) }, 'search'],
    [{ categoryId: '0' }, 'categoryId'],
    [{ categoryId: '2147483648' }, 'categoryId'],
    [{ requestedPriority: 'high' }, 'requestedPriority'],
    [{ currentStatus: 'CLOSED' }, 'currentStatus'],
    [{ sortBy: 'summary' }, 'sortBy'],
    [{ sortDirection: 'sideways' }, 'sortDirection'],
    [{ page: '0' }, 'page'],
    [{ page: '214748366' }, 'page'],
    [{ pageSize: '25' }, 'pageSize'],
    [{ page: ['1', '2'] }, 'page'],
    [{ privateField: 'secret' }, 'privateField'],
  ])('rejects invalid query %# with a field error', (query, field) => {
    const result = parseTicketListQuery(query);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors[field]).toEqual(expect.any(String));
    }
  });
});

describe('Requested Priority business ordering', () => {
  const tickets = [
    { requestedPriority: 'HIGH' as const, ticketNumber: 'TKT-HIGH' },
    { requestedPriority: 'LOW' as const, ticketNumber: 'TKT-LOW' },
    { requestedPriority: 'MEDIUM' as const, ticketNumber: 'TKT-MEDIUM-B' },
    { requestedPriority: 'MEDIUM' as const, ticketNumber: 'TKT-MEDIUM-A' },
  ];

  it('uses LOW, MEDIUM, HIGH rank and Ticket Number descending as the tie-breaker', () => {
    expect(
      [...tickets]
        .sort((left, right) => comparePriorityTickets(left, right, 'asc'))
        .map((ticket) => ticket.ticketNumber),
    ).toEqual(['TKT-LOW', 'TKT-MEDIUM-B', 'TKT-MEDIUM-A', 'TKT-HIGH']);

    expect(
      [...tickets]
        .sort((left, right) => comparePriorityTickets(left, right, 'desc'))
        .map((ticket) => ticket.ticketNumber),
    ).toEqual(['TKT-HIGH', 'TKT-MEDIUM-B', 'TKT-MEDIUM-A', 'TKT-LOW']);
  });
});
