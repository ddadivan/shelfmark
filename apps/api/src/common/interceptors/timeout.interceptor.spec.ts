import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BadRequestException, GatewayTimeoutException } from '@nestjs/common';
import { lastValueFrom, NEVER, of, throwError } from 'rxjs';
import { REQUEST_TIMEOUT_MS } from './models/request-timeout.const';
import { TimeoutInterceptor } from './timeout.interceptor';

const context = {} as never;

describe('TimeoutInterceptor', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays at 8 seconds, below the Vercel maxDuration of 30 seconds (ADR 0048)', () => {
    const config = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../../../../vercel.json'), 'utf8'),
    ) as { functions: Record<string, { maxDuration: number }> };
    const maxDuration = config.functions['api/index.mjs']?.maxDuration ?? 0;
    expect(maxDuration).toBe(30);
    expect(REQUEST_TIMEOUT_MS).toBe(8_000);
    expect(REQUEST_TIMEOUT_MS).toBeLessThan(maxDuration * 1000);
  });

  it('passes a fast result through', async () => {
    const result = new TimeoutInterceptor().intercept(context, { handle: () => of('ok') });
    await expect(lastValueFrom(result)).resolves.toBe('ok');
  });

  it('maps a slow handler to a 504', async () => {
    vi.useFakeTimers();
    const result = lastValueFrom(
      new TimeoutInterceptor().intercept(context, { handle: () => NEVER }),
    );
    const assertion = expect(result).rejects.toBeInstanceOf(GatewayTimeoutException);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);
    await assertion;
  });

  it('keeps other errors untouched', async () => {
    const failure = new BadRequestException('bad');
    const result = new TimeoutInterceptor().intercept(context, {
      handle: () => throwError(() => failure),
    });
    await expect(lastValueFrom(result)).rejects.toBe(failure);
  });
});
