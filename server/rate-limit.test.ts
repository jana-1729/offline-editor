import { describe, it, expect } from "vitest";
import { TokenBucket } from "./rate-limit";

describe("TokenBucket", () => {
  it("allows bursts up to capacity then blocks", () => {
    const b = new TokenBucket(3, 1, 0);
    expect(b.tryRemove(1, 0)).toBe(true);
    expect(b.tryRemove(1, 0)).toBe(true);
    expect(b.tryRemove(1, 0)).toBe(true);
    expect(b.tryRemove(1, 0)).toBe(false); // empty
  });

  it("refills over time", () => {
    const b = new TokenBucket(3, 2, 0); // 2 tokens/sec
    b.tryRemove(3, 0); // drain
    expect(b.tryRemove(1, 0)).toBe(false);
    // 1 second later → 2 tokens refilled
    expect(b.tryRemove(1, 1000)).toBe(true);
    expect(b.tryRemove(1, 1000)).toBe(true);
    expect(b.tryRemove(1, 1000)).toBe(false);
  });

  it("never exceeds capacity when idle", () => {
    const b = new TokenBucket(3, 100, 0);
    // Long idle should cap at capacity, not overflow.
    expect(b.tryRemove(3, 10_000)).toBe(true);
    expect(b.tryRemove(1, 10_000)).toBe(false);
  });
});
