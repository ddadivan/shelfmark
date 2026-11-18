import {
  findMatchingRule,
  normalizeRuleDomain,
  RULE_LIMIT,
  RULE_OFFER_LIMIT,
  ruleHost,
  type LinkResponse,
  type RuleOffer,
} from '@shelfmark/contracts';
import type { MockRuleOfferSource } from './models/mock-rule-offer-source.interface';

function newestFirst(a: LinkResponse, b: LinkResponse): number {
  return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
}

/**
 * The rule offer of `POST /api/rules/offers/check` in the mock (AI-2, ADR 0050), like the API:
 * the sites of the filed links that a rule can store (at most `HostsPerCheckMax`), skipping a dismissed one, one a rule
 * already matches, or every site once the rules are full; the newest `SameChoiceMin` links of the
 * site must share one live folder and none may carry an open "Moved by AI" mark. `count` is how
 * many of the newest links in a row are in that folder.
 */
export function mockRuleOffer(
  linkIds: readonly string[],
  source: MockRuleOfferSource,
): RuleOffer | null {
  if (source.rules.length >= RULE_LIMIT.PerUserMax) {
    return null;
  }
  const wanted = new Set(linkIds);
  const hosts = [
    ...new Set(
      source.links
        .filter((link) => wanted.has(link.id) && link.folderId !== null)
        .map((link) => ruleHost(link.url))
        // Only a host a rule can store (no IP address, no single label), like the API.
        .filter((host): host is string => host !== null && normalizeRuleDomain(host) === host),
    ),
  ].slice(0, RULE_OFFER_LIMIT.HostsPerCheckMax);
  for (const host of hosts) {
    if (
      source.dismissed.includes(host) ||
      findMatchingRule(source.rules, `https://${host}/`) !== null
    ) {
      continue;
    }
    const candidates = source.links
      .filter((link) => ruleHost(link.url) === host)
      .sort(newestFirst)
      .slice(0, RULE_OFFER_LIMIT.CandidatesMax);
    const folderId = candidates[0]?.folderId ?? null;
    const newest = candidates.slice(0, RULE_OFFER_LIMIT.SameChoiceMin);
    const qualifies =
      folderId !== null &&
      source.liveFolder(folderId) &&
      newest.length === RULE_OFFER_LIMIT.SameChoiceMin &&
      newest.every(
        (link) => link.folderId === folderId && source.autoAppliedFolder(link.id) === null,
      );
    if (!qualifies) {
      continue;
    }
    const run = candidates.findIndex(
      (link) => link.folderId !== folderId || source.autoAppliedFolder(link.id) !== null,
    );
    return { domain: host, folderId, count: run === -1 ? candidates.length : run };
  }
  return null;
}
