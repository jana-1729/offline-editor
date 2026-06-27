/**
 * Token-bucket rate limiter. One per connection caps message throughput so a
 * single malicious client cannot flood the realtime server. Time is injectable
 * for deterministic testing.
 */
export class TokenBucket {
  private tokens: number;
  private last: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSec: number,
    now: number = Date.now(),
  ) {
    this.tokens = capacity;
    this.last = now;
  }

  /** Try to consume `n` tokens. Returns false when the bucket is empty. */
  tryRemove(n = 1, now: number = Date.now()): boolean {
    this.refill(now);
    if (this.tokens >= n) {
      this.tokens -= n;
      return true;
    }
    return false;
  }

  private refill(now: number) {
    const elapsedSec = Math.max(0, (now - this.last) / 1000);
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsedSec * this.refillPerSec,
    );
    this.last = now;
  }
}
