import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/prisma.js', () => ({
  default: {
    requesterUser: { findUnique: vi.fn() },
  },
}));

import prisma from '../../src/prisma.js';
import {
  RequesterContextRequest,
  requireRequesterContext,
} from '../../src/requester-context.js';

const findUnique = (
  prisma as unknown as {
    requesterUser: { findUnique: ReturnType<typeof vi.fn> };
  }
).requesterUser.findUnique;

const app = express();
app.get('/probe', requireRequesterContext, (req, res) => {
  res.status(200).json({ requester: (req as RequesterContextRequest).requester });
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('X-Requester-Id context middleware', () => {
  it('rejects a missing header', async () => {
    const response = await request(app).get('/probe');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('REQUESTER_CONTEXT_REQUIRED');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects a malformed UUID without querying the database', async () => {
    const response = await request(app)
      .get('/probe')
      .set('X-Requester-Id', 'not-a-uuid');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('REQUESTER_CONTEXT_INVALID');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects an unknown or inactive Requester with the same safe response', async () => {
    findUnique.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Inactive Requester',
      email: 'inactive@example.test',
      isActive: false,
    });

    const response = await request(app)
      .get('/probe')
      .set('X-Requester-Id', '11111111-1111-4111-8111-111111111111');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('REQUESTER_CONTEXT_INVALID');
  });

  it('rejects an unknown Requester with the same safe response', async () => {
    findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get('/probe')
      .set('X-Requester-Id', '11111111-1111-4111-8111-111111111111');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('REQUESTER_CONTEXT_INVALID');
  });

  it('logs an unexpected lookup failure and returns its safe correlation ID', async () => {
    const internalError = new Error('private database detail');
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    findUnique.mockRejectedValue(internalError);

    const response = await request(app)
      .get('/probe')
      .set('X-Requester-Id', '11111111-1111-4111-8111-111111111111');

    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({
      code: 'REQUESTER_CONTEXT_UNAVAILABLE',
      message: expect.any(String),
      correlationId: expect.any(String),
    });
    expect(response.text).not.toContain('private database detail');
    expect(logSpy).toHaveBeenCalledWith('Unexpected API failure', {
      correlationId: response.body.error.correlationId,
      code: 'REQUESTER_CONTEXT_UNAVAILABLE',
      operation: 'requester-context.verify',
      error: internalError,
    });
  });

  it('attaches a safe active Requester context and reaches the handler', async () => {
    findUnique.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Jennifer Anderson',
      email: 'jennifer.anderson@example.test',
      isActive: true,
    });

    const response = await request(app)
      .get('/probe')
      .set('X-Requester-Id', '11111111-1111-4111-8111-111111111111');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      requester: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Jennifer Anderson',
        email: 'jennifer.anderson@example.test',
      },
    });
  });
});
