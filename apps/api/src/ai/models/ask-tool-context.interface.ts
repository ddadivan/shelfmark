import type { AiTier, AuthUser } from '@shelfmark/contracts';
import type { LinkRefs } from '../ask/tools/link-refs';

/** What every Ask tool call runs with: the session user only, and the refs of this question. */
export interface AskToolContext {
  user: AuthUser;
  tier: AiTier;
  /** "Include my notes": notes are searched and shown only when true. */
  includeNotes: boolean;
  /** Search by meaning is `ready` for the user (else words only). */
  searchReady: boolean;
  refs: LinkRefs;
}
