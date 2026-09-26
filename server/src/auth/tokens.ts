import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
export const FULL_SESSION_SECONDS = 8 * 60 * 60;
export const INITIAL_SESSION_SECONDS = 15 * 60;

export function tokenDigest(token: unknown): string | null {
  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) return null;
  return createHash('sha256').update(token, 'ascii').digest('hex');
}

export function tokenMatches(actual: unknown, expected: string): boolean {
  if (typeof actual !== 'string' || !TOKEN_PATTERN.test(actual) || !TOKEN_PATTERN.test(expected)) return false;
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

export function createSessionMaterial(mustChangePassword: boolean, now = new Date()) {
  const token = randomBytes(32).toString('hex');
  const lifetime = mustChangePassword ? INITIAL_SESSION_SECONDS : FULL_SESSION_SECONDS;
  return {
    token,
    tokenHash: tokenDigest(token)!,
    csrfToken: randomBytes(32).toString('hex'),
    expiresAt: new Date(now.getTime() + lifetime * 1_000),
    maxAgeSeconds: lifetime,
  };
}
