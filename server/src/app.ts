import express, { Request, Response } from 'express';
import cors from 'cors';
import prisma from './prisma.js';

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
    console.error('Failed to retrieve request categories.', error);
    res.status(500).json({
      error: 'Unable to load request categories',
    });
  }
});

export default app;
