import { apiFetch } from './auth-api';
export type Owner = { id: string; name: string; role: string; isActive?: boolean };
export type WorkflowTicket = {
  id: string; ticketNumber: string; ticketDate: string; summary: string; description: string;
  category: { id: number; name: string }; relatedSystem: { id: number; name: string };
  requester: { id: string; name: string; email: string }; owner: Owner | null;
  requestedPriority: string; itPriority: string; currentStatus: string; version: number;
  requesterResolvedAt: string | null; updatedAt: string;
  attachments: { id: string; originalName: string; sizeBytes: number; mimeType: string; removedAt: string | null; removalReason: string | null; canDownload: boolean }[];
};
export type Page<T> = { data: T[]; meta: { page: number; pageSize: number; totalItems: number; totalPages: number } };
export class ApiFailure extends Error { constructor(message: string, public status: number, public code: string, public fieldErrors?: Record<string, string>) { super(message); } }
export async function workflow<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await apiFetch(`${import.meta.env.VITE_API_URL ?? ''}/api${path}`, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiFailure(response.status >= 500 ? 'The request could not be completed. Please try again.' : data?.error?.message ?? 'Unable to connect. Please try again.', response.status, data?.error?.code ?? 'UNAVAILABLE', data?.error?.fieldErrors);
  if (!data) throw new Error('Unable to read the response. Please try again.');
  return data as T;
}
export const label = (value: string) => value.toLowerCase().split('_').map(word => word[0]?.toUpperCase() + word.slice(1)).join(' ');
export const dateLabel = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
export const statuses = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];
export const transitions: Record<string, string[]> = { NEW: ['OPEN', 'CANCELLED'], OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'], IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'], WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'], RESOLVED: ['CLOSED', 'REOPENED'], CLOSED: ['REOPENED'], REOPENED: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'], CANCELLED: [] };
