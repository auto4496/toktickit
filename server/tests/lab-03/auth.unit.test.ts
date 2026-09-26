import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  normalizeEmail,
  passwordValidationError,
  verifyPassword,
} from '../../src/auth/password.js';
import { FixedWindowLimiter } from '../../src/auth/rate-limit.js';
import { createSessionMaterial, tokenDigest, tokenMatches } from '../../src/auth/tokens.js';

describe('Lab 3 password rules (UNIT-01 / AC-03)', () => {
  it('normalizes only the email and preserves plus/dot identities', () => {
    expect(normalizeEmail('  First.Last+lab@EXAMPLE.TEST  ')).toBe('first.last+lab@example.test');
    for (const input of [null, {}, '', 'person', 'a b@example.test', 'a@@example.test']) {
      expect(normalizeEmail(input)).toBeNull();
    }
  });

  it('accepts passphrases and exact code-point boundaries without composition requirements', () => {
    expect(passwordValidationError('a'.repeat(14))).toBeTruthy();
    expect(passwordValidationError('a'.repeat(15))).toBeNull();
    expect(passwordValidationError('a'.repeat(128))).toBeNull();
    expect(passwordValidationError('a'.repeat(129))).toBeTruthy();
    expect(passwordValidationError('😀'.repeat(128))).toBeNull();
    expect(passwordValidationError('😀'.repeat(129))).toBeTruthy();
    expect(passwordValidationError('a quiet green garden')).toBeNull();
    expect(passwordValidationError(' '.repeat(20))).toBeTruthy();
    expect(passwordValidationError(null)).toBeTruthy();
  });

  it('uses independent salts and real scrypt, without trimming passwords or accepting damaged hashes', async () => {
    const password = '  a quiet green garden  ';
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(first).toMatch(/^scrypt\$v1\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    expect(first).not.toContain(password);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword(password.trim(), first)).toBe(false);
    expect(await verifyPassword('another quiet garden', first)).toBe(false);
    for (const broken of ['', first + '00', first.replace('131072', '1'), first.replace('scrypt', 'plain')]) {
      expect(await verifyPassword(password, broken)).toBe(false);
    }
    await expect(hashPassword('short')).rejects.toThrow('15');
  }, 15_000);

  it('does not normalize distinct Unicode passwords into the same password', async () => {
    const composed = 'café in a green garden';
    const decomposed = composed.normalize('NFD');
    const hash = await hashPassword(composed);
    expect(await verifyPassword(decomposed, hash)).toBe(false);
  }, 10_000);
});

describe('Lab 3 fixed-window limits (UNIT-02 / AC-03)', () => {
  it('blocks only after the failure budget, with accurate retry time and fixed expiration', () => {
    let now = 1_000;
    const limiter = new FixedWindowLimiter(5, 15 * 60_000, 100, () => now);
    expect(limiter.retryAfter('account')).toBe(0);
    for (let i = 0; i < 4; i++) limiter.recordFailure('account');
    expect(limiter.retryAfter('account')).toBe(0);
    limiter.recordFailure('account');
    expect(limiter.retryAfter('account')).toBe(900);
    now += 1_001;
    expect(limiter.retryAfter('account')).toBe(899);
    expect(limiter.retryAfter('someone-else')).toBe(0);
    now = 901_000;
    expect(limiter.retryAfter('account')).toBe(0);
    limiter.recordFailure('account');
    expect(limiter.retryAfter('account')).toBe(0);
  });

  it('bounds keys without evicting an active account throttle to admit attacker-controlled keys', () => {
    let now = 0;
    const limiter = new FixedWindowLimiter(1, 10_000, 2, () => now);
    limiter.recordFailure('first');
    limiter.recordFailure('second');
    expect(limiter.retryAfter('third')).toBe(10);
    expect(limiter.retryAfter('first')).toBe(10);
    now = 10_000;
    expect(limiter.retryAfter('third')).toBe(0);
    limiter.recordFailure('third');
    expect(limiter.retryAfter('third')).toBe(10);
  });

  it('rejects invalid limiter configuration', () => {
    expect(() => new FixedWindowLimiter(0, 100, 2)).toThrow();
    expect(() => new FixedWindowLimiter(1, 0, 2)).toThrow();
    expect(() => new FixedWindowLimiter(1, 100, 0)).toThrow();
  });
});

describe('Lab 3 opaque session material (UNIT-02 / AC-04)', () => {
  it('generates distinct 256-bit bearer and CSRF tokens and stores only a bearer digest', () => {
    const first = createSessionMaterial(false, new Date('2026-09-08T00:00:00Z'));
    const second = createSessionMaterial(true, new Date('2026-09-08T00:00:00Z'));
    expect(first.token).toMatch(/^[a-f0-9]{64}$/);
    expect(first.csrfToken).toMatch(/^[a-f0-9]{64}$/);
    expect(first.token).not.toBe(first.csrfToken);
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(tokenDigest(first.token));
    expect(first.tokenHash).not.toBe(first.token);
    expect(first.expiresAt.toISOString()).toBe('2026-09-08T08:00:00.000Z');
    expect(second.expiresAt.toISOString()).toBe('2026-09-08T00:15:00.000Z');
    expect(tokenMatches(first.csrfToken, first.csrfToken)).toBe(true);
    expect(tokenMatches(first.csrfToken, second.csrfToken)).toBe(false);
    expect(tokenMatches('', '')).toBe(false);
    expect(tokenMatches(first.csrfToken, 'a')).toBe(false);
    expect(tokenDigest('invalid')).toBeNull();
  });
});
