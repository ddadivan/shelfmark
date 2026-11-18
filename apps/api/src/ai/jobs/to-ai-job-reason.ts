import { AI_JOB_REASON, type AiJobReason } from '@shelfmark/contracts';

const REASONS: readonly string[] = Object.values(AI_JOB_REASON);

function isReason(value: string): value is AiJobReason {
  return REASONS.includes(value);
}

/** A stored reason, `null` for none or anything past the CHECK. */
export function toAiJobReason(value: string | null): AiJobReason | null {
  return value !== null && isReason(value) ? value : null;
}
