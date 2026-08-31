import { randomUUID } from 'node:crypto';
import { Response } from 'express';

export const sendExpectedError = (
  res: Response,
  status: number,
  code: string,
  message: string,
) => res.status(status).json({ error: { code, message } });

export const sendUnexpectedError = (
  res: Response,
  code: string,
  message: string,
  operation: string,
  error: unknown,
) => {
  const correlationId = randomUUID();

  console.error('Unexpected API failure', {
    correlationId,
    code,
    operation,
    error,
  });

  return res.status(500).json({
    error: {
      code,
      message,
      correlationId,
    },
  });
};
