import { BadRequestException, GatewayTimeoutException } from '@nestjs/common';
import { lastValueFrom, NEVER, of, throwError } from 'rxjs';
import { REQUEST_TIMEOUT_MS } from './models/request-timeout.const';
import { TimeoutInterceptor } from './timeout.interceptor';

const context = {} as never;

describe('TimeoutInterceptor', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays below the Vercel maxDuration of 10 seconds', () => {
    expect(REQUEST_TIMEOUT_MS).toBeLessThan(10_000);
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
