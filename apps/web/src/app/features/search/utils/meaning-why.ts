import { MEANING_REASON_SOURCE, type MeaningReason } from '@shelfmark/contracts';
import type { MeaningWhy } from '../models/meaning-why.interface';

/**
 * The "why it matched" line of a meaning result: "Close to: {reasons}", or "… (from the summary)"
 * when every reason is a summary clause; `null` without reasons. The reasons are plain text.
 */
export function meaningWhy(why: readonly MeaningReason[]): MeaningWhy | null {
  const texts = why.map((reason) => reason.text.trim()).filter((text) => text !== '');
  if (texts.length === 0) {
    return null;
  }
  const fromSummary = why.every((reason) => reason.source === MEANING_REASON_SOURCE.Summary);
  return {
    key: fromSummary ? 'ai.search.fromSummary' : 'ai.search.why',
    reasons: texts.join(', '),
  };
}
