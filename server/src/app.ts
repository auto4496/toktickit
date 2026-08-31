import express, { Request, Response } from 'express';
import cors from 'cors';
import prisma from './prisma.js';
import { sendUnexpectedError } from './api-error.js';

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

export default app;
