import type { LinkResponse } from '@shelfmark/contracts';

/** Loads the session user's live links of these refs for cards (missing ones are left out). */
export type AskCardLoader = (refs: readonly number[]) => Promise<Map<number, LinkResponse>>;
