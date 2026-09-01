import { createHash, randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { RequesterSummary } from './requester-context.js';

export const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TICKET_NUMBER_ATTEMPTS = 3;
const POSTGRES_INTEGER_MAX = 2_147_483_647;
const priorities = ['LOW', 'MEDIUM', 'HIGH'] as const;

export type TicketPriority = (typeof priorities)[number];

export type NormalizedTicketInput = {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: TicketPriority;
  description: string;
};

export type TicketFieldErrors = Partial<
  Record<keyof NormalizedTicketInput, string>
>;

export type TicketValidationResult =
  | { success: true; value: NormalizedTicketInput }
  | { success: false; fieldErrors: TicketFieldErrors };

const normalizeSummary = (value: string) => value.normalize('NFC').trim();

const normalizeDescription = (value: string) =>
  value.normalize('NFC').replace(/\r\n/g, '\n').trim();

const isPostgresIntegerId = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value > 0 &&
  value <= POSTGRES_INTEGER_MAX;

export const validateTicketInput = (body: unknown): TicketValidationResult => {
  const input =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const fieldErrors: TicketFieldErrors = {};

  const categoryId = input.categoryId;
  if (!isPostgresIntegerId(categoryId)) {
    fieldErrors.categoryId = 'Select an active Category.';
  }

  const relatedSystemId = input.relatedSystemId;
  if (!isPostgresIntegerId(relatedSystemId)) {
    fieldErrors.relatedSystemId = 'Select an active Related System.';
  }

  const requestedPriority = input.requestedPriority;
  if (
    typeof requestedPriority !== 'string' ||
    !priorities.includes(requestedPriority as TicketPriority)
  ) {
    fieldErrors.requestedPriority = 'Select LOW, MEDIUM, or HIGH.';
  }

  const summary =
    typeof input.summary === 'string' ? normalizeSummary(input.summary) : '';
  if (summary.length < 5 || summary.length > 120) {
    fieldErrors.summary = 'Summary must contain 5 to 120 characters.';
  }

  const description =
    typeof input.description === 'string'
      ? normalizeDescription(input.description)
      : '';
  if (description.length < 10 || description.length > 2_000) {
    fieldErrors.description = 'Description must contain 10 to 2000 characters.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    value: {
      categoryId: categoryId as number,
      relatedSystemId: relatedSystemId as number,
      summary,
      requestedPriority: requestedPriority as TicketPriority,
      description,
    },
  };
};

export const canonicalizeTicketRequest = (
  requesterId: string,
  input: NormalizedTicketInput,
) =>
  JSON.stringify({
    requesterId: requesterId.toLowerCase(),
    categoryId: input.categoryId,
    relatedSystemId: input.relatedSystemId,
    summary: normalizeSummary(input.summary),
    requestedPriority: input.requestedPriority.toUpperCase(),
    description: normalizeDescription(input.description),
  });

export const hashCanonicalTicketRequest = (
  requesterId: string,
  input: NormalizedTicketInput,
) =>
  createHash('sha256')
    .update(canonicalizeTicketRequest(requesterId, input), 'utf8')
    .digest('hex');

export const buildTicketNumber = (createdAt: Date, uuid: string) => {
  const date = createdAt.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = uuid.replaceAll('-', '').slice(0, 8).toUpperCase();
  return `TKT-${date}-${suffix}`;
};

export class TicketNumberGenerationError extends Error {
  constructor() {
    super('A unique Ticket Number could not be generated.');
    this.name = 'TicketNumberGenerationError';
  }
}

export const insertWithUniqueTicketNumber = async <T>(
  insert: (ticketNumber: string) => Promise<T | null>,
  createdAt: Date,
  uuidSource: () => string = randomUUID,
) => {
  for (let attempt = 0; attempt < TICKET_NUMBER_ATTEMPTS; attempt += 1) {
    const inserted = await insert(buildTicketNumber(createdAt, uuidSource()));
    if (inserted) return inserted;
  }

  throw new TicketNumberGenerationError();
};

class ReferenceValidationError extends Error {
  constructor(readonly fieldErrors: TicketFieldErrors) {
    super('A selected reference value is inactive or unavailable.');
    this.name = 'ReferenceValidationError';
  }
}

const ticketRelations = {
  requester: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
} satisfies Prisma.TicketInclude;

type TicketWithRelations = Prisma.TicketGetPayload<{
  include: typeof ticketRelations;
}>;

export type TicketResponseData = ReturnType<typeof formatTicketResponse>;

const formatTicketResponse = (ticket: TicketWithRelations) => ({
  id: ticket.id,
  ticketNumber: ticket.ticketNumber,
  ticketDate: ticket.createdAt.toISOString(),
  requester: ticket.requester,
  category: ticket.category,
  relatedSystem: ticket.relatedSystem,
  summary: ticket.summary,
  requestedPriority: ticket.requestedPriority,
  itPriority: ticket.itPriority,
  description: ticket.description,
  currentStatus: ticket.currentStatus,
  attachments: [] as never[],
  updatedAt: ticket.updatedAt.toISOString(),
});

type CreateTicketResult =
  | { kind: 'created'; data: TicketResponseData }
  | { kind: 'replayed'; data: TicketResponseData }
  | { kind: 'conflict' }
  | { kind: 'invalid-reference'; fieldErrors: TicketFieldErrors };

export const createTicketForRequester = async (
  client: PrismaClient,
  requester: RequesterSummary,
  input: NormalizedTicketInput,
  rawIdempotencyKey: string,
): Promise<CreateTicketResult> => {
  const idempotencyKey = rawIdempotencyKey.toLowerCase();
  const requestHash = hashCanonicalTicketRequest(requester.id, input);

  try {
    return await client.$transaction(async (transaction) => {
      const reservationId = randomUUID();
      const insertedReservation = await transaction.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          INSERT INTO "TicketCreateRequest"
            ("id", "requesterId", "idempotencyKey", "requestHash", "createdAt")
          VALUES
            (${reservationId}, ${requester.id}, ${idempotencyKey}, ${requestHash}, NOW())
          ON CONFLICT ("requesterId", "idempotencyKey") DO NOTHING
          RETURNING "id"
        `,
      );

      if (insertedReservation.length === 0) {
        const reservation = await transaction.ticketCreateRequest.findUnique({
          where: {
            requesterId_idempotencyKey: {
              requesterId: requester.id,
              idempotencyKey,
            },
          },
          select: { requestHash: true, ticketId: true, completedAt: true },
        });

        if (!reservation?.ticketId || !reservation.completedAt) {
          throw new Error('An idempotency reservation is incomplete.');
        }
        if (reservation.requestHash !== requestHash) return { kind: 'conflict' };

        const ticket = await transaction.ticket.findUniqueOrThrow({
          where: { id: reservation.ticketId },
          include: ticketRelations,
        });
        return { kind: 'replayed', data: formatTicketResponse(ticket) };
      }

      const [category, relatedSystem] = await Promise.all([
        transaction.category.findUnique({
          where: { id: input.categoryId },
          select: { id: true, isActive: true },
        }),
        transaction.relatedSystem.findUnique({
          where: { id: input.relatedSystemId },
          select: { id: true, isActive: true },
        }),
      ]);
      const referenceErrors: TicketFieldErrors = {};
      if (!category?.isActive) {
        referenceErrors.categoryId = 'Select an active Category.';
      }
      if (!relatedSystem?.isActive) {
        referenceErrors.relatedSystemId = 'Select an active Related System.';
      }
      if (Object.keys(referenceErrors).length > 0) {
        throw new ReferenceValidationError(referenceErrors);
      }

      const createdAt = new Date();
      const insertedTicket = await insertWithUniqueTicketNumber(
        async (ticketNumber) => {
          const rows = await transaction.$queryRaw<Array<{ id: string }>>(
            Prisma.sql`
              INSERT INTO "Ticket"
                ("id", "ticketNumber", "requesterId", "categoryId", "relatedSystemId",
                 "summary", "requestedPriority", "itPriority", "description",
                 "currentStatus", "createdAt", "updatedAt")
              VALUES
                (${randomUUID()}, ${ticketNumber}, ${requester.id}, ${input.categoryId},
                 ${input.relatedSystemId}, ${input.summary},
                 CAST(${input.requestedPriority} AS "Priority"), NULL, ${input.description},
                 CAST('NEW' AS "TicketStatus"), ${createdAt}, ${createdAt})
              ON CONFLICT ("ticketNumber") DO NOTHING
              RETURNING "id"
            `,
          );
          return rows[0] ?? null;
        },
        createdAt,
      );

      await transaction.ticketCreateRequest.update({
        where: { id: insertedReservation[0].id },
        data: { ticketId: insertedTicket.id, completedAt: new Date() },
      });

      const ticket = await transaction.ticket.findUniqueOrThrow({
        where: { id: insertedTicket.id },
        include: ticketRelations,
      });
      return { kind: 'created', data: formatTicketResponse(ticket) };
    });
  } catch (error) {
    if (error instanceof ReferenceValidationError) {
      return { kind: 'invalid-reference', fieldErrors: error.fieldErrors };
    }
    throw error;
  }
};
