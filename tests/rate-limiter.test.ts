import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenBucketRateLimiter, createTrelloRateLimiters } from '../src/rate-limiter.js';

describe('TokenBucketRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows up to maxRequests immediate calls and rejects the next one', () => {
    const limiter = new TokenBucketRateLimiter(5, 1000);

    for (let i = 0; i < 5; i++) {
      expect(limiter.canMakeRequest()).toBe(true);
    }

    expect(limiter.canMakeRequest()).toBe(false);
  });

  it('refills fully after a full window has elapsed', () => {
    const limiter = new TokenBucketRateLimiter(5, 1000);

    for (let i = 0; i < 5; i++) {
      expect(limiter.canMakeRequest()).toBe(true);
    }
    expect(limiter.canMakeRequest()).toBe(false);

    vi.setSystemTime(Date.now() + 1000);

    expect(limiter.canMakeRequest()).toBe(true);
  });

  it('refills proportionally for a partial elapsed window', () => {
    const limiter = new TokenBucketRateLimiter(10, 1000);

    for (let i = 0; i < 10; i++) {
      expect(limiter.canMakeRequest()).toBe(true);
    }
    expect(limiter.canMakeRequest()).toBe(false);

    // Advance half the window — should refill ~5 tokens
    vi.setSystemTime(Date.now() + 500);

    let granted = 0;
    for (let i = 0; i < 10; i++) {
      if (limiter.canMakeRequest()) {
        granted += 1;
      }
    }

    expect(granted).toBe(5);
  });

  it('caps refilled tokens at maxTokens regardless of elapsed time', () => {
    const limiter = new TokenBucketRateLimiter(3, 1000);

    // Don't consume — advance way past the window
    vi.setSystemTime(Date.now() + 10_000);

    expect(limiter.canMakeRequest()).toBe(true);
    expect(limiter.canMakeRequest()).toBe(true);
    expect(limiter.canMakeRequest()).toBe(true);
    expect(limiter.canMakeRequest()).toBe(false);
  });

  it('waitForAvailableToken resolves immediately when capacity is available', async () => {
    vi.useRealTimers();
    const limiter = new TokenBucketRateLimiter(5, 1000);

    const sentinel = Symbol('timeout');
    const timeout = new Promise<typeof sentinel>(resolve => {
      setTimeout(() => resolve(sentinel), 50);
    });

    const result = await Promise.race([
      limiter.waitForAvailableToken().then(() => 'resolved' as const),
      timeout,
    ]);

    expect(result).toBe('resolved');
  });
});

describe('createTrelloRateLimiters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes both limiters and aggregate methods', () => {
    const limiters = createTrelloRateLimiters();

    expect(limiters.apiKeyLimiter).toBeInstanceOf(TokenBucketRateLimiter);
    expect(limiters.tokenLimiter).toBeInstanceOf(TokenBucketRateLimiter);
    expect(typeof limiters.canMakeRequest).toBe('function');
    expect(typeof limiters.waitForAvailableToken).toBe('function');
  });

  it('canMakeRequest returns true when both limiters have tokens', () => {
    const limiters = createTrelloRateLimiters();

    expect(limiters.canMakeRequest()).toBe(true);
  });
});
