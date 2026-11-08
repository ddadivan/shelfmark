import { randomBytes } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { CronSecretGuard } from './cron-secret.guard';
import { CRON_ENV } from './models/cron-env.const';

const SECRET = randomBytes(24).toString('hex');

function contextWith(authorization: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
  } as unknown as ExecutionContext;
}

describe('CronSecretGuard', () => {
  const guard = new CronSecretGuard();
  const saved = process.env[CRON_ENV.Secret];

  afterEach(() => {
    if (saved === undefined) delete process.env[CRON_ENV.Secret];
    else process.env[CRON_ENV.Secret] = saved;
  });

  it('accepts the exact bearer secret', () => {
    process.env[CRON_ENV.Secret] = SECRET;
    expect(guard.canActivate(contextWith(`Bearer ${SECRET}`))).toBe(true);
  });

  it.each([
    ['no header', undefined],
    ['empty bearer', 'Bearer '],
    ['wrong secret', 'Bearer nope'],
    ['a longer value', `Bearer ${SECRET}x`],
    ['a prefix', `Bearer ${SECRET.slice(0, -1)}`],
    ['the wrong scheme', `Basic ${SECRET}`],
    ['no scheme', SECRET],
    ['lower-case scheme', `bearer ${SECRET}`],
  ])('refuses %s', (_label, header) => {
    process.env[CRON_ENV.Secret] = SECRET;
    expect(() => guard.canActivate(contextWith(header))).toThrow(UnauthorizedException);
  });

  it('fails closed when the secret is unset, even for an empty or guessed bearer', () => {
    delete process.env[CRON_ENV.Secret];
    expect(() => guard.canActivate(contextWith('Bearer '))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contextWith('Bearer undefined'))).toThrow(UnauthorizedException);
  });

  it('fails closed when the secret is empty or shorter than 32 characters', () => {
    for (const short of ['', 'x'.repeat(31)]) {
      process.env[CRON_ENV.Secret] = short;
      expect(() => guard.canActivate(contextWith(`Bearer ${short}`))).toThrow(
        UnauthorizedException,
      );
    }
    process.env[CRON_ENV.Secret] = 'x'.repeat(32);
    expect(guard.canActivate(contextWith(`Bearer ${'x'.repeat(32)}`))).toBe(true);
  });
});
