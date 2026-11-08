import type { OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorageService, type ThrottlerStorage } from '@nestjs/throttler';

/**
 * In-memory throttler storage for specs that can forget every counter. Per-route presets
 * (`RATE_LIMIT.AddLink`, `Preview`) are fixed by the route decorators, so a spec that sends many
 * requests to such a route calls `reset()` between tests instead of tripping the limit.
 * `createAuthTestApp` provides it in place of the real storage.
 */
export class ResettableThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private inner = new ThrottlerStorageService();

  increment(
    ...args: Parameters<ThrottlerStorage['increment']>
  ): ReturnType<ThrottlerStorage['increment']> {
    return this.inner.increment(...args);
  }

  /** Drops every counter and block. */
  reset(): void {
    this.inner.onApplicationShutdown();
    this.inner = new ThrottlerStorageService();
  }

  onApplicationShutdown(): void {
    this.inner.onApplicationShutdown();
  }
}
