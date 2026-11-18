import { randomBytes } from 'node:crypto';

/** A short random id for a stored group or pair (unique within a report, never guessable across). */
export function newCleanupId(): string {
  return randomBytes(9).toString('base64url');
}
