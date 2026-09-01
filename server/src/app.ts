import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import prisma from './prisma.js';
import { sendExpectedError, sendUnexpectedError } from './api-error.js';
import {
  IDEMPOTENCY_KEY_PATTERN,
  createTicketForRequester,
  validateTicketInput,
} from './ticket-create.js';
import {
  listTicketsForRequester,
  parseTicketListQuery,
} from './ticket-query.js';
import {
  attachmentFilePath,
  attachmentTempDirectory,
  createAttachmentForTicket,
  getOwnedAttachment,
  getOwnedTicketDetail,
  isAttachmentOperationError,
  MAX_ATTACHMENT_BYTES,
  removeOwnedAttachment,
} from './attachment-service.js';
import {
  RequesterContextRequest,
  requireRequesterContext,
} from './requester-context.js';

const app = express();

app.use(cors());
app.use(express.json());

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdir(attachmentTempDirectory, { recursive: true })
        .then(() => callback(null, attachmentTempDirectory))
        .catch((error: unknown) => callback(error as Error, attachmentTempDirectory));
    },
    filename: (_req, _file, callback) => callback(null, `upload-${randomUUID()}`),
  }),
  limits: { files: 1, fileSize: MAX_ATTACHMENT_BYTES },
});
const validUuid = (value: string) => UUID_PATTERN.test(value);
const routeId = (value: string | string[]) => (Array.isArray(value) ? '' : value);
const invalidId = (res: Response, resource: 'Ticket' | 'Attachment') =>
  sendExpectedError(res, 400, `INVALID_${resource.toUpperCase()}_ID`, `Provide a valid ${resource} ID.`);
const resourceNotFound = (res: Response) =>
  sendExpectedError(res, 404, 'RESOURCE_NOT_FOUND', 'The requested resource was not found.');

app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'TokTickIT Backend Server is running successfully',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'TokTickIT API',
  });
});

app.get('/api/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    res.status(200).json(categories);
  } catch (error) {
    sendUnexpectedError(
      res,
      'REFERENCE_DATA_UNAVAILABLE',
      'Request categories could not be loaded. Try again.',
      'categories.list',
      error,
    );
  }
});

app.get('/api/related-systems', async (_req: Request, res: Response) => {
  try {
    const relatedSystems = await prisma.relatedSystem.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    relatedSystems.sort(
      (left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }) ||
        left.id - right.id,
    );
    res.status(200).json(relatedSystems);
  } catch (error) {
    sendUnexpectedError(
      res,
      'REFERENCE_DATA_UNAVAILABLE',
      'Related systems could not be loaded. Try again.',
      'related-systems.list',
      error,
    );
  }
});

app.get('/api/requesters', async (_req: Request, res: Response) => {
  try {
    const requesters = await prisma.requesterUser.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });

    res.status(200).json(requesters);
  } catch (error) {
    sendUnexpectedError(
      res,
      'REQUESTERS_UNAVAILABLE',
      'Requesters could not be loaded. Try again.',
      'requesters.list',
      error,
    );
  }
});

app.get(
  '/api/tickets',
  requireRequesterContext,
  async (req: RequesterContextRequest, res: Response) => {
    const validation = parseTicketListQuery(
      req.query as Record<string, unknown>,
    );
    if (!validation.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_QUERY_PARAMETER',
          message: 'Please correct the invalid query parameters.',
          fieldErrors: validation.fieldErrors,
        },
      });
      return;
    }

    try {
      if (validation.value.categoryId !== undefined) {
        const category = await prisma.category.findUnique({
          where: { id: validation.value.categoryId },
          select: { id: true },
        });
        if (!category) {
          res.status(400).json({
            error: {
              code: 'INVALID_QUERY_PARAMETER',
              message: 'Please correct the invalid query parameters.',
              fieldErrors: {
                categoryId: 'categoryId must reference an existing Category.',
              },
            },
          });
          return;
        }
      }

      const result = await listTicketsForRequester(
        prisma,
        req.requester!.id,
        validation.value,
      );
      res.status(200).json(result);
    } catch (error) {
      sendUnexpectedError(
        res,
        'TICKET_LIST_FAILED',
        'Tickets could not be loaded. Try again.',
        'tickets.list',
        error,
      );
    }
  },
);

app.get(
  '/api/tickets/:ticketId',
  requireRequesterContext,
  async (req: RequesterContextRequest, res: Response) => {
    const ticketId = routeId(req.params.ticketId);
    if (!validUuid(ticketId)) return invalidId(res, 'Ticket');
    try {
      res.status(200).json({ data: await getOwnedTicketDetail(prisma, req.requester!.id, ticketId) });
    } catch (error) {
      if (isAttachmentOperationError(error) && error.kind === 'not-found') return resourceNotFound(res);
      sendUnexpectedError(res, 'TICKET_DETAIL_FAILED', 'The Ticket could not be loaded. Try again.', 'tickets.detail', error);
    }
  },
);

app.post(
  '/api/tickets/:ticketId/attachments',
  requireRequesterContext,
  (req: RequesterContextRequest, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (error: unknown) => {
      if (!error) return next();
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        sendExpectedError(res, 413, 'ATTACHMENT_TOO_LARGE', 'Each Attachment must be 5 MiB or smaller.');
        return;
      }
      sendExpectedError(res, 400, 'ATTACHMENT_UPLOAD_INVALID', 'Provide one Attachment file.');
    });
  },
  async (req: RequesterContextRequest, res: Response) => {
    const ticketId = routeId(req.params.ticketId);
    if (!validUuid(ticketId)) return invalidId(res, 'Ticket');
    if (!req.file) {
      res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Provide one Attachment file.', fieldErrors: { file: 'Choose one Attachment file.' } } });
      return;
    }
    try {
      const result = await createAttachmentForTicket(prisma, req.requester!.id, ticketId, req.file);
      if (result.kind === 'invalid') {
        const status = result.validation.code === 'ATTACHMENT_TOO_LARGE' ? 413 : result.validation.code === 'ATTACHMENT_TYPE_INVALID' ? 415 : 400;
        sendExpectedError(res, status, result.validation.code, result.validation.message);
        return;
      }
      res.status(201).json({ data: result.data });
    } catch (error) {
      if (isAttachmentOperationError(error)) {
        if (error.kind === 'not-found') return resourceNotFound(res);
        if (error.kind === 'limit') return sendExpectedError(res, 409, 'ATTACHMENT_LIMIT_REACHED', 'A Ticket can have at most five active Attachments.');
      }
      sendUnexpectedError(res, 'ATTACHMENT_UPLOAD_FAILED', 'The Attachment could not be uploaded. Try again.', 'attachments.upload', error);
    }
  },
);

app.get(
  '/api/attachments/:attachmentId',
  requireRequesterContext,
  async (req: RequesterContextRequest, res: Response) => {
    const attachmentId = routeId(req.params.attachmentId);
    if (!validUuid(attachmentId)) return invalidId(res, 'Attachment');
    try {
      const attachment = await getOwnedAttachment(prisma, req.requester!.id, attachmentId);
      res.status(200).json({ id: attachment.id, ticketId: attachment.ticketId, originalName: attachment.originalName, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes, uploadedAt: attachment.uploadedAt.toISOString(), removedAt: attachment.removedAt?.toISOString() ?? null, removalReason: attachment.removalReason, canDownload: attachment.removedAt === null });
    } catch (error) {
      if (isAttachmentOperationError(error) && error.kind === 'not-found') return resourceNotFound(res);
      sendUnexpectedError(res, 'ATTACHMENT_METADATA_FAILED', 'The Attachment could not be loaded. Try again.', 'attachments.metadata', error);
    }
  },
);

app.get(
  '/api/attachments/:attachmentId/download',
  requireRequesterContext,
  async (req: RequesterContextRequest, res: Response) => {
    const attachmentId = routeId(req.params.attachmentId);
    if (!validUuid(attachmentId)) return invalidId(res, 'Attachment');
    try {
      const attachment = await getOwnedAttachment(prisma, req.requester!.id, attachmentId);
      if (attachment.removedAt) return resourceNotFound(res);
      try {
        const bytes = await fs.readFile(attachmentFilePath(attachment));
        res.setHeader('Content-Type', attachment.mimeType);
        res.setHeader('Content-Length', String(bytes.length));
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.status(200).send(bytes);
      } catch {
        sendExpectedError(res, 404, 'ATTACHMENT_FILE_UNAVAILABLE', 'This file cannot be downloaded right now.');
      }
    } catch (error) {
      if (isAttachmentOperationError(error) && error.kind === 'not-found') return resourceNotFound(res);
      sendUnexpectedError(res, 'ATTACHMENT_DOWNLOAD_FAILED', 'The Attachment could not be downloaded. Try again.', 'attachments.download', error);
    }
  },
);

app.delete(
  '/api/attachments/:attachmentId',
  requireRequesterContext,
  async (req: RequesterContextRequest, res: Response) => {
    const attachmentId = routeId(req.params.attachmentId);
    if (!validUuid(attachmentId)) return invalidId(res, 'Attachment');
    try {
      const result = await removeOwnedAttachment(prisma, req.requester!.id, attachmentId, req.body?.reason);
      if (result.kind === 'invalid') {
        res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Please correct the highlighted fields.', fieldErrors: { reason: result.validation.message } } });
        return;
      }
      res.status(200).json({ data: result.data });
    } catch (error) {
      if (isAttachmentOperationError(error)) {
        if (error.kind === 'not-found') return resourceNotFound(res);
        if (error.kind === 'removed') return sendExpectedError(res, 409, 'ATTACHMENT_ALREADY_REMOVED', 'This Attachment has already been removed.');
      }
      sendUnexpectedError(res, 'ATTACHMENT_REMOVE_FAILED', 'The Attachment could not be removed. Try again.', 'attachments.remove', error);
    }
  },
);

app.post(
  '/api/tickets',
  requireRequesterContext,
  async (req: RequesterContextRequest, res: Response) => {
    const idempotencyKey = req.header('Idempotency-Key');
    if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      sendExpectedError(
        res,
        400,
        'IDEMPOTENCY_KEY_INVALID',
        'Retry this submission with a valid idempotency key.',
      );
      return;
    }

    const validation = validateTicketInput(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Please correct the highlighted fields.',
          fieldErrors: validation.fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await createTicketForRequester(
        prisma,
        req.requester!,
        validation.value,
        idempotencyKey,
      );

      if (result.kind === 'invalid-reference') {
        res.status(400).json({
          error: {
            code: 'REFERENCE_VALUE_INACTIVE',
            message: 'Select active reference values and try again.',
            fieldErrors: result.fieldErrors,
          },
        });
        return;
      }

      if (result.kind === 'conflict') {
        sendExpectedError(
          res,
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'This submission key was already used for different Ticket data.',
        );
        return;
      }

      if (result.kind === 'replayed') {
        res.setHeader('Idempotency-Replayed', 'true');
        res.status(200).json({ data: result.data });
        return;
      }

      res.status(201).json({ data: result.data });
    } catch (error) {
      sendUnexpectedError(
        res,
        'TICKET_CREATE_FAILED',
        'The Ticket could not be created. Try again.',
        'tickets.create',
        error,
      );
    }
  },
);

type JsonParseError = SyntaxError & { type?: string };

const isJsonParseError = (error: unknown): error is JsonParseError =>
  error instanceof SyntaxError &&
  (error as JsonParseError).type === 'entity.parse.failed';

app.use(
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (isJsonParseError(error)) {
      sendExpectedError(
        res,
        400,
        'INVALID_JSON',
        'Request body must contain valid JSON.',
      );
      return;
    }

    sendUnexpectedError(
      res,
      'REQUEST_FAILED',
      'The request could not be processed. Try again.',
      'request.middleware',
      error,
    );
  },
);

export default app;
