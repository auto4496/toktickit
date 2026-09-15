type Window = { failures: number; expiresAt: number };

/** Single-process local-lab limiter. No durable account lock or unlock state. */
export class FixedWindowLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly failureLimit: number,
    private readonly windowMs: number,
    private readonly capacity: number,
    private readonly clock: () => number = Date.now,
  ) {
    if (![failureLimit, windowMs, capacity].every((value) => Number.isSafeInteger(value) && value > 0)) {
      throw new Error('Limiter settings must be positive safe integers.');
    }
  }

  private expire(now: number) {
    for (const [key, value] of this.windows) {
      if (value.expiresAt <= now) this.windows.delete(key);
    }
  }

  retryAfter(key: string): number {
    const now = this.clock();
    this.expire(now);
    const current = this.windows.get(key);
    if (current) {
      return current.failures >= this.failureLimit
        ? Math.max(1, Math.ceil((current.expiresAt - now) / 1_000))
        : 0;
    }
    if (this.windows.size < this.capacity) return 0;
    // Fail closed under a flood of distinct identities, rather than evicting
    // live account limits and allowing another set of guesses immediately.
    let earliest = Number.POSITIVE_INFINITY;
    for (const value of this.windows.values()) earliest = Math.min(earliest, value.expiresAt);
    return Math.max(1, Math.ceil((earliest - now) / 1_000));
  }

  recordFailure(key: string): void {
    const now = this.clock();
    this.expire(now);
    const current = this.windows.get(key);
    if (current) current.failures = Math.min(this.failureLimit, current.failures + 1);
    else if (this.windows.size < this.capacity) {
      this.windows.set(key, { failures: 1, expiresAt: now + this.windowMs });
    }
  }
}
