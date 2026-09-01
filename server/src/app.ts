import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import prisma from './prisma.js';
import { sendExpectedError, sendUnexpectedError } from './api-error.js';
import {
  IDEMPOTENCY_KEY_PATTERN,
  createTicketForRequester,
  validateTicketInput,
} from './ticket-create.js';
import {
  RequesterContextRequest,
  requireRequesterContext,
} from './requester-context.js';

const app = express();

app.use(cors());
app.use(express.json());

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
