import type { RuleMatch } from './rule-match.interface';

/**
 * `GET /api/rules/:id/matches` (#398, "Apply to existing links"): the user's live links in Unsorted
 * whose host matches the rule, newest first, at most `LINK_LIMIT.BatchMax` of them (one bulk update);
 * `total` counts all of them.
 */
export interface RuleMatchesResponse {
  items: RuleMatch[];
  total: number;
}
