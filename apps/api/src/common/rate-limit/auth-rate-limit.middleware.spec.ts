import type { ThrottlerStorage } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { createAuthRateLimitMiddleware } from './auth-rate-limit.middleware';

function run(path: string, storage: ThrottlerStorage) {
  const req = { path, headers: {}, ip: '192.0.2.1' } as unknown as Request;
  const json = vi.fn();
  const res = {
    locals: { requestId: 'rid' },
    setHeader: vi.fn(),
    status: vi.fn(() => ({ json })),
  } as unknown as Response;
  const next = vi.fn();
  return { done: createAuthRateLimitMiddleware(storage, false)(req, res, next), next, res, json };
}

describe('createAuthRateLimitMiddleware', () => {
  it('passes a storage failure to next(error) exactly once', async () => {
    const failure = new Error('storage down');
    const storage: ThrottlerStorage = { increment: vi.fn().mockRejectedValue(failure) };
    const { done, next } = run('/api/auth/sign-out', storage);
    await done;
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(failure);
  });

  it('does not touch the storage for get-session or non-auth paths', async () => {
    const storage: ThrottlerStorage = { increment: vi.fn() };
    for (const path of ['/api/auth/get-session', '/api/health']) {
      const { done, next } = run(path, storage);
      await done;
      expect(next).toHaveBeenCalledWith();
    }
    expect(storage.increment).not.toHaveBeenCalled();
  });

  it('calls next() when the client is not blocked', async () => {
    const storage: ThrottlerStorage = {
      increment: vi.fn().mockResolvedValue({
        totalHits: 1,
        timeToExpire: 1,
        isBlocked: false,
        timeToBlockExpire: 0,
      }),
    };
    const { done, next } = run('/api/auth/sign-out', storage);
    await done;
    expect(next).toHaveBeenCalledWith();
  });
});
