import { randomBytes } from 'node:crypto';
import { SHARE_LIMIT } from '@shelfmark/contracts';

/**
 * A new public collection token: `SHARE_LIMIT.TokenBytes` (16) bytes from the CSPRNG as unpadded
 * base64url, so 22 characters carrying 128 bits (ADR 0040). It is a capability: never log it.
 */
export function generateShareToken(): string {
  return randomBytes(SHARE_LIMIT.TokenBytes).toString('base64url');
}
