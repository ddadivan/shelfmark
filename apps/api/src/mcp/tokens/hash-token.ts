import { createHash } from 'node:crypto';

/**
 * The stored form of a personal token: SHA-256 as 64 lower-case hex characters. A 256-bit random
 * secret needs no slow hash or pepper (ADR 0053); the digest is the unique lookup key.
 */
export function hashToken(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}
