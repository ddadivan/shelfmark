import { createHash, timingSafeEqual } from 'node:crypto';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { CRON_ENV } from './models/cron-env.const';
import { CRON_SECRET_MIN_LENGTH } from './models/cron-secret-min-length.const';
import { DEMO_ERROR_MESSAGE } from './models/demo-error-message.const';

const BEARER_PREFIX = 'Bearer ';

/** The misconfiguration is logged once per process, not on every request. */
let warned = false;

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/**
 * Authenticates Vercel Cron (`Authorization: Bearer ${CRON_SECRET}`) on the one route that carries it
 * (ADR 0034). Fails closed: with `CRON_SECRET` unset or shorter than 32 characters every request is a
 * 401, the same answer as a wrong secret, so the response never says whether it is configured. The
 * comparison runs on SHA-256 digests with `timingSafeEqual`: constant time, and no length leak. The
 * secret is read per request and never logged.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  private readonly logger = new Logger(CronSecretGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const secret = process.env[CRON_ENV.Secret];
    if (secret === undefined || secret.length < CRON_SECRET_MIN_LENGTH) {
      if (!warned) {
        warned = true;
        this.logger.warn(`${CRON_ENV.Secret} is missing or too short: cron requests are refused`);
      }
      throw new UnauthorizedException(DEMO_ERROR_MESSAGE.Unauthorized);
    }
    const header = context.switchToHttp().getRequest<Request>().headers.authorization;
    const given =
      typeof header === 'string' && header.startsWith(BEARER_PREFIX)
        ? header.slice(BEARER_PREFIX.length)
        : '';
    if (!timingSafeEqual(digest(given), digest(secret))) {
      throw new UnauthorizedException(DEMO_ERROR_MESSAGE.Unauthorized);
    }
    return true;
  }
}
