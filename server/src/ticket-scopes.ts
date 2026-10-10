import { TicketStatus } from '@prisma/client';

export const openTicketStatuses: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'];
