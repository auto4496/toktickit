import prisma from '../src/prisma.js';
import { createSessionMaterial } from '../src/auth/tokens.js';

// Login/password verification is covered separately by auth.api.test.ts.
// Regression fixtures still traverse the real cookie/session middleware.
export async function sessionHeaders(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const material = createSessionMaterial(false);
  await prisma.authSession.create({ data: {
    userId, userVersion: user.version, tokenHash: material.tokenHash,
    csrfToken: material.csrfToken, expiresAt: material.expiresAt,
  } });
  return { Cookie: `toktickit.sid=${material.token}`, Origin: 'http://localhost:3000', 'X-CSRF-Token': material.csrfToken };
}

export const fixtureCredential = { passwordHash: '!TEST_SESSION_ONLY', mustChangePassword: false };
