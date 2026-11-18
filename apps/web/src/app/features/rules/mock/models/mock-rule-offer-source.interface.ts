import type { LinkResponse } from '@shelfmark/contracts';
import type { MockRule } from './mock-rule.interface';

/** What the mock rule offer check reads: the user's own library, rules and "Not now" domains. */
export interface MockRuleOfferSource {
  readonly links: readonly LinkResponse[];
  readonly rules: readonly MockRule[];
  /** Domains the user answered "Not now" for. */
  readonly dismissed: readonly string[];
  /** Whether a folder is live (not in Trash). */
  readonly liveFolder: (id: string) => boolean;
  /** The folder Automatic mode put a link in while its mark is open, else `null`. */
  readonly autoAppliedFolder: (linkId: string) => string | null;
}
