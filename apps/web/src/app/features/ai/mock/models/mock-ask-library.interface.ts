import type { LinkResponse } from '@shelfmark/contracts';

/** The mock library as the Ask planner reads it. */
export interface MockAskLibrary {
  /** Live links, newest first. */
  readonly links: readonly LinkResponse[];
  /** Links closest to a question by meaning (title, tags, summary), best first. */
  rank(question: string): LinkResponse[];
  /** A link as the API returns it (folder, tags resolved). */
  view(link: LinkResponse): LinkResponse;
}
