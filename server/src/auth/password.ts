import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const COST = { N: 131_072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const HASH_FORMAT = /^scrypt\$v1\$131072\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/;
const MAX_HASH_JOBS = 2;
const MAX_WAITING_JOBS = 32;
let activeJobs = 0;
const waitingJobs: Array<() => void> = [];

export class PasswordServiceBusyError extends Error {
  constructor() {
    super('Password verification is busy. Try again shortly.');
    this.name = 'PasswordServiceBusyError';
  }
}

async function acquireHashSlot() {
  if (activeJobs < MAX_HASH_JOBS) {
    activeJobs += 1;
    return;
  }
  if (waitingJobs.length >= MAX_WAITING_JOBS) throw new PasswordServiceBusyError();
  // A completed job transfers its slot directly to the next waiter. A new
  // caller cannot steal that slot between promise resolution and resumption.
  await new Promise<void>((resolve) => waitingJobs.push(resolve));
}

async function deriveKey(password: string, salt: Buffer) {
  await acquireHashSlot();
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, COST, (error, key) => {
        if (error) reject(error);
        else resolve(key);
      });
    });
  } finally {
    const next = waitingJobs.shift();
    if (next) next();
    else activeJobs -= 1;
  }
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254) return null;
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (!local || local.length > 64 || /\s/.test(local) || local.startsWith('.') ||
      local.endsWith('.') || local.includes('..')) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(domain)) return null;
  return email;
}

export function passwordValidationError(value: unknown): string | null {
  if (typeof value !== 'string') return 'Enter a password containing 15 to 128 characters.';
  const length = Array.from(value).length;
  if (length < 15 || length > 128 || Buffer.byteLength(value, 'utf8') > 512) {
    return 'Use 15 to 128 characters and no more than 512 UTF-8 bytes.';
  }
  if (!value.trim()) return 'A password cannot contain only whitespace.';
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const error = passwordValidationError(password);
  if (error) throw new Error(error);
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$v1$131072$8$1$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: unknown, encodedHash: string): Promise<boolean> {
  if (passwordValidationError(password)) return false;
  // Never take arbitrary cost parameters from a corrupted/untrusted hash.
  const match = HASH_FORMAT.exec(encodedHash);
  if (!match) return false;
  const expected = Buffer.from(match[2], 'hex');
  const actual = await deriveKey(password as string, Buffer.from(match[1], 'hex'));
  return timingSafeEqual(actual, expected);
}
