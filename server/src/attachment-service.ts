import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import { MAX_ATTACHMENT_BYTES, validateAttachmentFile, validateRemovalReason } from './attachment-validation.js';

const storageRoot = path.resolve(process.env.ATTACHMENT_STORAGE_DIR ?? path.join(process.cwd(), 'tmp', 'attachments'));
export const attachmentTempDirectory = path.join(storageRoot, 'tmp');
export const attachmentFinalDirectory = path.join(storageRoot, 'files');
export const MAX_ACTIVE_ATTACHMENTS = 5;

const notFound = () => Object.assign(new Error('Resource not found.'), { kind: 'not-found' as const });
const limitReached = () => Object.assign(new Error('Attachment limit reached.'), { kind: 'limit' as const });
const alreadyRemoved = () => Object.assign(new Error('Attachment has already been removed.'), { kind: 'removed' as const });
export type AttachmentOperationError = ReturnType<typeof notFound> | ReturnType<typeof limitReached> | ReturnType<typeof alreadyRemoved>;

export const isAttachmentOperationError = (error: unknown): error is AttachmentOperationError =>
  error instanceof Error && ['not-found', 'limit', 'removed'].includes((error as Error & { kind?: string }).kind ?? '');

const metadataSelect = {
  id: true,
  ticketId: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  uploadedAt: true,
  removedAt: true,
  removalReason: true,
} satisfies Prisma.AttachmentSelect;

type AttachmentRecord = Prisma.AttachmentGetPayload<{ select: typeof metadataSelect }>;

export const formatAttachmentMetadata = (attachment: AttachmentRecord) => ({
  id: attachment.id,
  ticketId: attachment.ticketId,
  originalName: attachment.originalName,
  mimeType: attachment.mimeType,
  sizeBytes: attachment.sizeBytes,
  uploadedAt: attachment.uploadedAt.toISOString(),
  removedAt: attachment.removedAt?.toISOString() ?? null,
  removalReason: attachment.removalReason,
  canDownload: attachment.removedAt === null,
});

export const ensureAttachmentDirectories = async () => {
  await Promise.all([
    fs.mkdir(attachmentTempDirectory, { recursive: true }),
    fs.mkdir(attachmentFinalDirectory, { recursive: true }),
  ]);
};

export const safeUnlink = async (filePath: string | undefined) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Attachment file cleanup failed', { error });
    }
  }
};

export const getOwnedTicketDetail = async (client: PrismaClient, requesterId: string, ticketId: string) => {
  const ticket = await client.ticket.findFirst({
    where: { id: ticketId, requesterId },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true } },
      relatedSystem: { select: { id: true, name: true } },
      attachments: { select: metadataSelect, orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }] },
    },
  });
  if (!ticket) throw notFound();
  return {
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
    attachments: ticket.attachments.map(formatAttachmentMetadata),
    updatedAt: ticket.updatedAt.toISOString(),
  };
};

export const createAttachmentForTicket = async (
  client: PrismaClient,
  requesterId: string,
  ticketId: string,
  file: Express.Multer.File,
) => {
  const temporaryPath = file.path;
  let finalPath: string | undefined;
  let moved = false;
  try {
    await ensureAttachmentDirectories();
    const bytes = await fs.readFile(temporaryPath);
    const validation = validateAttachmentFile({ originalName: file.originalname, mimeType: file.mimetype, bytes });
    if (!validation.success) {
      await safeUnlink(temporaryPath);
      return { kind: 'invalid' as const, validation };
    }

    const storedName = `${randomUUID()}.${validation.value.extension}`;
    const storageKey = storedName;
    const destinationPath = path.join(attachmentFinalDirectory, storedName);
    finalPath = destinationPath;
    const attachment = await client.$transaction(async (transaction) => {
      const ownedRows = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "Ticket"
        WHERE "id" = ${ticketId} AND "requesterId" = ${requesterId}
        FOR UPDATE
      `);
      if (ownedRows.length === 0) throw notFound();
      const activeCount = await transaction.attachment.count({ where: { ticketId, removedAt: null } });
      if (activeCount >= MAX_ACTIVE_ATTACHMENTS) throw limitReached();
      await fs.rename(temporaryPath, destinationPath);
      moved = true;
      return transaction.attachment.create({
        data: {
          ticketId,
          originalName: validation.value.originalName,
          storedName,
          storageKey,
          mimeType: validation.value.mimeType,
          sizeBytes: validation.value.sizeBytes,
          uploadedByRequesterId: requesterId,
        },
        select: metadataSelect,
      });
    });
    return { kind: 'created' as const, data: formatAttachmentMetadata(attachment) };
  } catch (error) {
    await safeUnlink(temporaryPath);
    if (moved) await safeUnlink(finalPath);
    throw error;
  }
};

export const getOwnedAttachment = async (client: PrismaClient, requesterId: string, attachmentId: string) => {
  const attachment = await client.attachment.findFirst({
    where: { id: attachmentId, ticket: { requesterId } },
    select: { ...metadataSelect, storedName: true, storageKey: true },
  });
  if (!attachment) throw notFound();
  return attachment;
};

export const removeOwnedAttachment = async (client: PrismaClient, requesterId: string, attachmentId: string, rawReason: unknown) => {
  const validation = validateRemovalReason(rawReason);
  if (!validation.success) return { kind: 'invalid' as const, validation };
  const attachment = await client.$transaction(async (transaction) => {
    const current = await transaction.attachment.findFirst({
      where: { id: attachmentId, ticket: { requesterId } },
      select: { id: true, removedAt: true },
    });
    if (!current) throw notFound();
    if (current.removedAt) throw alreadyRemoved();
    return transaction.attachment.update({
      where: { id: current.id },
      data: { removedAt: new Date(), removalReason: validation.value, removedByRequesterId: requesterId },
      select: metadataSelect,
    });
  });
  return { kind: 'removed' as const, data: formatAttachmentMetadata(attachment) };
};

export const attachmentFilePath = (attachment: { storageKey: string }) => path.join(attachmentFinalDirectory, attachment.storageKey);
export { MAX_ATTACHMENT_BYTES };
