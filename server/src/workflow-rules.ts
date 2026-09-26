import { TicketStatus } from '@prisma/client';

export const statusTransitions: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['OPEN', 'CANCELLED'], OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'], CLOSED: ['REOPENED'],
  REOPENED: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'], CANCELLED: [],
};
export const terminal = (status: TicketStatus) => status === 'CLOSED' || status === 'CANCELLED';
export const needsOwner = (status: TicketStatus) => ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED'].includes(status);
export const needsConfirmation = (status: TicketStatus) => ['RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'].includes(status);
export const canIndicate = (status: TicketStatus) => ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'].includes(status);
export function normalizeContent(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const content = value.replace(/\r\n/g, '\n').normalize('NFC').trim();
  return [...content].length >= 1 && [...content].length <= 2000 ? content : null;
}
