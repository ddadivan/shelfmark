import { Logger } from '@nestjs/common';
import { AiBackgroundService } from './ai-background.service';

const REQUEST_CONTEXT = Symbol.for('@vercel/request-context');

type ContextHolder = Record<symbol, unknown>;

describe('AiBackgroundService', () => {
  afterEach(() => {
    delete (globalThis as ContextHolder)[REQUEST_CONTEXT];
    vi.restoreAllMocks();
  });

  it('runs the task outside Vercel without a request context', async () => {
    const task = vi.fn(() => Promise.resolve());
    new AiBackgroundService().defer(task);
    await vi.waitFor(() => expect(task).toHaveBeenCalledOnce());
  });

  it('hands the promise to waitUntil on Vercel', async () => {
    const waitUntil = vi.fn<(promise: Promise<unknown>) => void>();
    (globalThis as ContextHolder)[REQUEST_CONTEXT] = { get: () => ({ waitUntil }) };
    new AiBackgroundService().defer(() => Promise.resolve());
    expect(waitUntil).toHaveBeenCalledOnce();
    await waitUntil.mock.calls[0]?.[0];
  });

  it('logs a failure by its name only and never rejects', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const waitUntil = vi.fn<(promise: Promise<unknown>) => void>();
    (globalThis as ContextHolder)[REQUEST_CONTEXT] = { get: () => ({ waitUntil }) };
    const service = new AiBackgroundService();
    service.defer(() => Promise.reject(new TypeError('secret page text')));
    service.defer(() => {
      throw 'not an error';
    });
    await Promise.all(waitUntil.mock.calls.map((call) => call[0]));
    expect(error.mock.calls.map((call) => String(call[0])).sort()).toEqual([
      'AI background task failed (TypeError)',
      'AI background task failed (unknown)',
    ]);
  });
});
