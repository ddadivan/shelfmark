import { RULE_OFFER_LIMIT, ruleHost } from '@shelfmark/contracts';
import type { RuleOfferCandidate } from '../models/rule-offer-candidate.interface';

/**
 * The folder to offer for `host` (AI-2, ADR 0050): among the candidates (newest first) whose
 * `ruleHost` is exactly `host`, the newest `RULE_OFFER_LIMIT.SameChoiceMin` must share one folder
 * and none may have been filed by AI. Answers the folder and how many of the newest links in a row
 * are there, else `null`. Whether the folder is live is the caller's check.
 */
export function detectRuleOffer(
  host: string,
  candidates: readonly RuleOfferCandidate[],
): { folderId: string; count: number } | null {
  const same = candidates.filter((candidate) => ruleHost(candidate.url) === host);
  const folderId = same[0]?.folderId ?? null;
  if (folderId === null) return null;
  let count = 0;
  for (const candidate of same) {
    if (candidate.folderId !== folderId || candidate.autoFiled) break;
    count += 1;
  }
  return count >= RULE_OFFER_LIMIT.SameChoiceMin ? { folderId, count } : null;
}
