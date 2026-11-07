import { createHash } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Bucket shared by every route: one limit per client IP overall. */
export function perClientKey(tracker: string, throttlerName: string): string {
  return sha256(`client-${throttlerName}-${tracker}`);
}

/** Bucket of one handler, used by `@RateLimit` overrides so a strict route has its own counter. */
export function perRouteKey(
  context: ExecutionContext,
  tracker: string,
  throttlerName: string,
): string {
  return sha256(
    `${context.getClass().name}-${context.getHandler().name}-${throttlerName}-${tracker}`,
  );
}
