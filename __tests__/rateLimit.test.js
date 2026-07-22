import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit } from "@/app/_lib/rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit, then blocks", () => {
    const key = "test-a";
    expect(checkRateLimit(key, 3, 60000)).toBe(true);
    expect(checkRateLimit(key, 3, 60000)).toBe(true);
    expect(checkRateLimit(key, 3, 60000)).toBe(true);
    expect(checkRateLimit(key, 3, 60000)).toBe(false); // 4th within window
  });

  it("allows again after the window passes", () => {
    const key = "test-b";
    expect(checkRateLimit(key, 2, 1000)).toBe(true);
    expect(checkRateLimit(key, 2, 1000)).toBe(true);
    expect(checkRateLimit(key, 2, 1000)).toBe(false);

    vi.advanceTimersByTime(1001); // window elapses
    expect(checkRateLimit(key, 2, 1000)).toBe(true);
  });

  it("tracks keys independently", () => {
    expect(checkRateLimit("k1", 1, 60000)).toBe(true);
    expect(checkRateLimit("k1", 1, 60000)).toBe(false);
    expect(checkRateLimit("k2", 1, 60000)).toBe(true); // different key unaffected
  });
});
