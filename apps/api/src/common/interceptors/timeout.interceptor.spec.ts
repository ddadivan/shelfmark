import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BadRequestException,
  type ExecutionContext,
  GatewayTimeoutException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, NEVER, of, throwError, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { LongRunning } from './long-running.decorator';
import { REQUEST_TIMEOUT_MS } from './models/request-timeout.const';
import { TimeoutInterceptor } from './timeout.interceptor';

class Handlers {
  plain(): void {
    /* a normal route */
  }

  @LongRunning()
  streaming(): void {
    /* the Ask route */
  }
}

const contextFor = (handler: keyof Handlers): ExecutionContext =>
  ({ getHandler: () => Handlers.prototype[handler] }) as unknown as ExecutionContext;

const context = contextFor('plain');
const interceptor = () => new TimeoutInterceptor(new Reflector());

describe('TimeoutInterceptor', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays at 8 seconds, below the Vercel maxDuration of 30 seconds (ADR 0049)', () => {
    const config = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../../../../vercel.json'), 'utf8'),
    ) as { functions: Record<string, { maxDuration: number }> };
    const maxDuration = config.functions['api/index.mjs']?.maxDuration ?? 0;
    expect(maxDuration).toBe(30);
    expect(REQUEST_TIMEOUT_MS).toBe(8_000);
    expect(REQUEST_TIMEOUT_MS).toBeLessThan(maxDuration * 1000);
  });

  it('passes a fast result through', async () => {
    const result = interceptor().intercept(context, { handle: () => of('ok') });
    await expect(lastValueFrom(result)).resolves.toBe('ok');
  });

  it('maps a slow handler to a 504', async () => {
    vi.useFakeTimers();
    const result = lastValueFrom(interceptor().intercept(context, { handle: () => NEVER }));
    const assertion = expect(result).rejects.toBeInstanceOf(GatewayTimeoutException);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);
    await assertion;
  });

  it('never cuts a handler marked @LongRunning()', async () => {
    vi.useFakeTimers();
    const slow = timer(REQUEST_TIMEOUT_MS * 3).pipe(map(() => 'streamed'));
    const result = lastValueFrom(
      interceptor().intercept(contextFor('streaming'), { handle: () => slow }),
    );
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS * 3 + 1);
    await expect(result).resolves.toBe('streamed');
  });

  it('keeps other errors untouched', async () => {
    const failure = new BadRequestException('bad');
    const result = interceptor().intercept(context, {
      handle: () => throwError(() => failure),
    });
    await expect(lastValueFrom(result)).rejects.toBe(failure);
  });
});
