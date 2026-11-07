import { Logger } from '@nestjs/common';
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
  it('fails closed with a generic 500 ApiError when the storage fails', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const storage: ThrottlerStorage = {
      increment: vi.fn().mockRejectedValue(new Error('storage down: secret detail')),
    };
    const { done, next, res, json } = run('/api/auth/sign-out', storage);
    await done;
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal Server Error',
      requestId: 'rid',
    });
  });

  it('answers 429 with Retry-After in the ApiError shape when blocked', async () => {
    const storage: ThrottlerStorage = {
      increment: vi.fn().mockResolvedValue({
        totalHits: 21,
        timeToExpire: 10,
        isBlocked: true,
        timeToBlockExpire: 42,
      }),
    };
    const { done, next, res, json } = run('/api/auth/sign-out', storage);
    await done;
    expect(next).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', 42);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 429, error: 'Too Many Requests', requestId: 'rid' }),
    );
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
