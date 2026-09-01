import { Prisma, PrismaClient, Priority, TicketStatus } from '@prisma/client';

const POSTGRES_INTEGER_MAX = 2_147_483_647;
const PAGE_SIZES = [10, 20, 50] as const;
const SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'ticketNumber',
  'requestedPriority',
] as const;
const SORT_DIRECTIONS = ['asc', 'desc'] as const;
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];
const STATUSES: TicketStatus[] = ['NEW'];
const SUPPORTED_PARAMETERS = new Set([
  'search',
  'categoryId',
  'requestedPriority',
  'currentStatus',
  'sortBy',
  'sortDirection',
  'page',
  'pageSize',
]);

export type TicketSortBy = (typeof SORT_FIELDS)[number];
export type TicketSortDirection = (typeof SORT_DIRECTIONS)[number];
export type TicketPageSize = (typeof PAGE_SIZES)[number];

export type TicketListQuery = {
  search?: string;
  categoryId?: number;
  requestedPriority?: Priority;
  currentStatus?: TicketStatus;
  sortBy: TicketSortBy;
  sortDirection: TicketSortDirection;
  page: number;
  pageSize: TicketPageSize;
};

type QueryValidation =
  | { success: true; value: TicketListQuery }
  | { success: false; fieldErrors: Record<string, string> };

const ticketSummarySelect = {
  id: true,
  ticketNumber: true,
  createdAt: true,
  summary: true,
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  requestedPriority: true,
  itPriority: true,
  currentStatus: true,
  updatedAt: true,
} satisfies Prisma.TicketSelect;

type TicketSummaryRecord = Prisma.TicketGetPayload<{
  select: typeof ticketSummarySelect;
}>;

const readSingleString = (
  query: Record<string, unknown>,
  field: string,
  errors: Record<string, string>,
) => {
  const value = query[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    errors[field] = `${field} must be provided once.`;
    return undefined;
  }
  return value;
};

const parsePositiveInteger = (
  raw: string | undefined,
  field: string,
  errors: Record<string, string>,
) => {
  if (raw === undefined) return undefined;
  if (!/^[1-9]\d*$/.test(raw)) {
    errors[field] = `${field} must be a positive integer.`;
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > POSTGRES_INTEGER_MAX) {
    errors[field] = `${field} is outside the supported integer range.`;
    return undefined;
  }
  return value;
};

export const parseTicketListQuery = (
  query: Record<string, unknown>,
): QueryValidation => {
  const fieldErrors: Record<string, string> = {};

  for (const field of Object.keys(query)) {
    if (!SUPPORTED_PARAMETERS.has(field)) {
      fieldErrors[field] = 'Unsupported query parameter.';
    }
  }

  const rawSearch = readSingleString(query, 'search', fieldErrors);
  const rawCategoryId = readSingleString(query, 'categoryId', fieldErrors);
  const rawPriority = readSingleString(query, 'requestedPriority', fieldErrors);
  const rawStatus = readSingleString(query, 'currentStatus', fieldErrors);
  const rawSortBy = readSingleString(query, 'sortBy', fieldErrors);
  const rawSortDirection = readSingleString(query, 'sortDirection', fieldErrors);
  const rawPage = readSingleString(query, 'page', fieldErrors);
  const rawPageSize = readSingleString(query, 'pageSize', fieldErrors);

  let search: string | undefined;
  if (rawSearch !== undefined) {
    const trimmed = rawSearch.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      fieldErrors.search = 'search must contain 1 to 100 characters after trimming.';
    } else {
      search = trimmed;
    }
  }

  const categoryId = parsePositiveInteger(
    rawCategoryId,
    'categoryId',
    fieldErrors,
  );

  let requestedPriority: Priority | undefined;
  if (rawPriority !== undefined) {
    if (!PRIORITIES.includes(rawPriority as Priority)) {
      fieldErrors.requestedPriority = 'requestedPriority must be LOW, MEDIUM, or HIGH.';
    } else {
      requestedPriority = rawPriority as Priority;
    }
  }

  let currentStatus: TicketStatus | undefined;
  if (rawStatus !== undefined) {
    if (!STATUSES.includes(rawStatus as TicketStatus)) {
      fieldErrors.currentStatus = 'currentStatus must be NEW.';
    } else {
      currentStatus = rawStatus as TicketStatus;
    }
  }

  let sortBy: TicketSortBy = 'updatedAt';
  if (rawSortBy !== undefined) {
    if (!SORT_FIELDS.includes(rawSortBy as TicketSortBy)) {
      fieldErrors.sortBy = 'sortBy is not supported.';
    } else {
      sortBy = rawSortBy as TicketSortBy;
    }
  }

  let sortDirection: TicketSortDirection = 'desc';
  if (rawSortDirection !== undefined) {
    if (!SORT_DIRECTIONS.includes(rawSortDirection as TicketSortDirection)) {
      fieldErrors.sortDirection = 'sortDirection must be asc or desc.';
    } else {
      sortDirection = rawSortDirection as TicketSortDirection;
    }
  }

  const parsedPageSize = parsePositiveInteger(
    rawPageSize,
    'pageSize',
    fieldErrors,
  );
  let pageSize: TicketPageSize = 10;
  if (parsedPageSize !== undefined) {
    if (!PAGE_SIZES.includes(parsedPageSize as TicketPageSize)) {
      fieldErrors.pageSize = 'pageSize must be 10, 20, or 50.';
    } else {
      pageSize = parsedPageSize as TicketPageSize;
    }
  }

  const parsedPage = parsePositiveInteger(rawPage, 'page', fieldErrors);
  const page = parsedPage ?? 1;
  const maximumPage = Math.floor(POSTGRES_INTEGER_MAX / pageSize) + 1;
  if (parsedPage !== undefined && parsedPage > maximumPage) {
    fieldErrors.page = 'page is too large for the selected pageSize.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    value: {
      ...(search ? { search } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(requestedPriority ? { requestedPriority } : {}),
      ...(currentStatus ? { currentStatus } : {}),
      sortBy,
      sortDirection,
      page,
      pageSize,
    },
  };
};

const priorityRank: Record<Priority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

export const comparePriorityTickets = (
  left: Pick<TicketSummaryRecord, 'requestedPriority' | 'ticketNumber'>,
  right: Pick<TicketSummaryRecord, 'requestedPriority' | 'ticketNumber'>,
  direction: TicketSortDirection,
) => {
  const rankDifference =
    priorityRank[left.requestedPriority] - priorityRank[right.requestedPriority];
  if (rankDifference !== 0) {
    return direction === 'asc' ? rankDifference : -rankDifference;
  }
  return right.ticketNumber.localeCompare(left.ticketNumber);
};

const escapeSearchPattern = (value: string) => value.replace(/[\\%_]/g, '\\$&');

const buildWhere = (requesterId: string, query: TicketListQuery) => ({
  requesterId,
  ...(query.search
    ? {
        OR: [
          {
            ticketNumber: {
              contains: escapeSearchPattern(query.search),
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            summary: {
              contains: escapeSearchPattern(query.search),
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            description: {
              contains: escapeSearchPattern(query.search),
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }
    : {}),
  ...(query.categoryId ? { categoryId: query.categoryId } : {}),
  ...(query.requestedPriority
    ? { requestedPriority: query.requestedPriority }
    : {}),
  ...(query.currentStatus ? { currentStatus: query.currentStatus } : {}),
}) satisfies Prisma.TicketWhereInput;

const mapTicketSummary = (ticket: TicketSummaryRecord) => ({
  id: ticket.id,
  ticketNumber: ticket.ticketNumber,
  ticketDate: ticket.createdAt.toISOString(),
  summary: ticket.summary,
  category: ticket.category,
  relatedSystem: ticket.relatedSystem,
  requestedPriority: ticket.requestedPriority,
  itPriority: ticket.itPriority,
  currentStatus: ticket.currentStatus,
  updatedAt: ticket.updatedAt.toISOString(),
});

export const listTicketsForRequester = async (
  database: PrismaClient,
  requesterId: string,
  query: TicketListQuery,
) => {
  const where = buildWhere(requesterId, query);
  const skip = (query.page - 1) * query.pageSize;
  let records: TicketSummaryRecord[];
  let totalItems: number;

  if (query.sortBy === 'requestedPriority') {
    const rankedPriorities = query.requestedPriority
      ? [query.requestedPriority]
      : query.sortDirection === 'asc'
        ? PRIORITIES
        : [...PRIORITIES].reverse();
    const rankedWhere = rankedPriorities.map(
      (requestedPriority) =>
        ({ ...where, requestedPriority }) satisfies Prisma.TicketWhereInput,
    );
    const priorityPage = await database.$transaction(
      async (transaction) => {
        const groupCounts: number[] = [];
        for (const groupWhere of rankedWhere) {
          groupCounts.push(await transaction.ticket.count({ where: groupWhere }));
        }
        const pageRecords: TicketSummaryRecord[] = [];
        let remainingSkip = skip;
        let remainingTake = query.pageSize;
        for (
          let index = 0;
          index < rankedWhere.length && remainingTake > 0;
          index += 1
        ) {
          const groupCount = groupCounts[index];
          if (remainingSkip >= groupCount) {
            remainingSkip -= groupCount;
            continue;
          }
          const take = Math.min(remainingTake, groupCount - remainingSkip);
          pageRecords.push(
            ...(await transaction.ticket.findMany({
              where: rankedWhere[index],
              select: ticketSummarySelect,
              orderBy: { ticketNumber: 'desc' },
              skip: remainingSkip,
              take,
            })),
          );
          remainingTake -= take;
          remainingSkip = 0;
        }
        return {
          records: pageRecords,
          totalItems: groupCounts.reduce((total, count) => total + count, 0),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    totalItems = priorityPage.totalItems;
    records = priorityPage.records;
  } else {
    const primaryOrder = {
      [query.sortBy]: query.sortDirection,
    } as Prisma.TicketOrderByWithRelationInput;
    const orderBy: Prisma.TicketOrderByWithRelationInput[] = [primaryOrder];
    if (query.sortBy !== 'ticketNumber') {
      orderBy.push({ ticketNumber: 'desc' });
    }

    [totalItems, records] = await database.$transaction([
      database.ticket.count({ where }),
      database.ticket.findMany({
        where,
        select: ticketSummarySelect,
        orderBy,
        skip,
        take: query.pageSize,
      }),
    ]);
  }

  return {
    data: records.map(mapTicketSummary),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    },
  };
};
