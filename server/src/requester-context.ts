import { NextFunction, Request, Response } from 'express';
import prisma from './prisma.js';
import { sendExpectedError, sendUnexpectedError } from './api-error.js';

export type RequesterSummary = {
  id: string;
  name: string;
  email: string;
};

export interface RequesterContextRequest extends Request {
  requester?: RequesterSummary;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const INVALID_REQUESTER_MESSAGE = 'Select an active requester before continuing.';

export const requireRequesterContext = async (
  req: RequesterContextRequest,
  res: Response,
  next: NextFunction,
) => {
  const requesterId = req.header('X-Requester-Id');

  if (!requesterId) {
    sendExpectedError(
      res,
      400,
      'REQUESTER_CONTEXT_REQUIRED',
      INVALID_REQUESTER_MESSAGE,
    );
    return;
  }

  if (!UUID_PATTERN.test(requesterId)) {
    sendExpectedError(
      res,
      400,
      'REQUESTER_CONTEXT_INVALID',
      INVALID_REQUESTER_MESSAGE,
    );
    return;
  }

  try {
    const requester = await prisma.requesterUser.findUnique({
      where: { id: requesterId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    if (!requester?.isActive) {
      sendExpectedError(
        res,
        400,
        'REQUESTER_CONTEXT_INVALID',
        INVALID_REQUESTER_MESSAGE,
      );
      return;
    }

    req.requester = {
      id: requester.id,
      name: requester.name,
      email: requester.email,
    };
    next();
  } catch {
    sendUnexpectedError(
      res,
      'REQUESTER_CONTEXT_UNAVAILABLE',
      'Requester context could not be verified. Try again.',
    );
  }
};
