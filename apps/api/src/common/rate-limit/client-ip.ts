import { isIP } from 'node:net';
import { normalizeIp } from '@nestjs/throttler';
import { isRecord } from '../util/is-record';

const VERCEL_FORWARDED_FOR = 'x-vercel-forwarded-for';
const FORWARDED_FOR = 'x-forwarded-for';
const UNKNOWN_CLIENT = 'unknown';

function headerValue(headers: Record<string, unknown>, name: string): string | undefined {
  const value = headers[name];
  return typeof value === 'string' ? value : undefined;
}

function validIp(candidate: string | undefined): string | undefined {
  const trimmed = candidate?.trim();
  return trimmed !== undefined && isIP(trimmed) !== 0 ? trimmed : undefined;
}

/**
 * The client IP used as the rate-limit key. Behind Vercel the proxy sets `x-vercel-forwarded-for`
 * (a client cannot choose it), then `x-forwarded-for` is read for its first hop; both are honoured
 * only when `trustProxyHeaders` is true (Vercel or non-production). Otherwise, or when no header
 * holds a valid address, the socket address (`req.ip`) is used. IPv6 addresses are grouped by
 * their /64. An unknown address shares one bucket, which only happens without any usable address.
 */
export function clientIp(req: unknown, trustProxyHeaders: boolean): string {
  const headers = isRecord(req) && isRecord(req['headers']) ? req['headers'] : {};
  const socketIp = isRecord(req) && typeof req['ip'] === 'string' ? req['ip'] : undefined;
  const fromProxy = trustProxyHeaders
    ? (validIp(headerValue(headers, VERCEL_FORWARDED_FOR)?.split(',')[0]) ??
      validIp(headerValue(headers, FORWARDED_FOR)?.split(',')[0]))
    : undefined;
  const ip = fromProxy ?? validIp(socketIp);
  return ip === undefined ? UNKNOWN_CLIENT : normalizeIp(ip);
}
