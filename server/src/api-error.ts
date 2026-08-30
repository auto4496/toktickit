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
) => {
  const correlationId = randomUUID();
  return res.status(500).json({
    error: {
      code,
      message,
      correlationId,
    },
  });
};
