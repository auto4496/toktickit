import express, { Request, Response } from 'express';

const app = express();

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'TokTickIT Backend Server is running successfully',
    timestamp: new Date().toISOString(),
  });
});

export default app;
