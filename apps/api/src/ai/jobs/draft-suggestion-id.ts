import { createHash } from 'node:crypto';

/**
 * A stable id for a suggestion of a draft that has no link (and so no suggestion row) yet: the same
 * job and target always give the same UUID-shaped id, so polls do not re-render the chips.
 */
export function draftSuggestionId(jobId: string, kind: string, target: string): string {
  const hex = createHash('sha256').update(`${jobId}\u0000${kind}\u0000${target}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
