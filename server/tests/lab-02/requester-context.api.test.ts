import express from 'express';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { User } from '@prisma/client';
import { RequesterContextRequest, requireRequesterContext } from '../../src/requester-context.js';

function probe(user?: Partial<User>) {
  const app = express();
  app.use((req: RequesterContextRequest, _res, next) => {
    if (user) req.auth = { user: user as User, session: {} as NonNullable<RequesterContextRequest['auth']>['session'] };
    next();
  });
  app.get('/probe', requireRequesterContext, (req: RequesterContextRequest, res) => res.json({ requester: req.requester }));
  return app;
}
describe('Requester adapter for authenticated sessions', () => {
  it.each([undefined, 'not-a-uuid', '11111111-1111-4111-8111-111111111111'])('ignores legacy identity %s', async (header) => {
    const call = request(probe()).get('/probe');
    if (header) call.set('X-Requester-Id', header);
    expect((await call).status).toBe(401);
  });
  it.each(['IT_STAFF', 'ADMINISTRATOR'] as const)('rejects %s', async role => {
    expect((await request(probe({ role, isActive: true })).get('/probe')).status).toBe(403);
  });
  it('returns only the session requester identity, even with a forged header', async () => {
    const user = { id: 'real-session-user', name: 'Jennifer', email: 'jennifer@example.test', role: 'REQUESTER' as const, isActive: true, passwordHash: 'private' };
    const result = await request(probe(user)).get('/probe').set('X-Requester-Id', 'someone-else');
    expect(result.body).toEqual({ requester: { id: user.id, name: user.name, email: user.email } });
  });
});
