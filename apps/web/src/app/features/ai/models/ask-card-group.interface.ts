import type { AskSearchFilter, AskSource } from '@shelfmark/contracts';

/** Link cards the answer showed at one point (`links` event), numbered like the citations. */
export interface AskCardGroup {
  readonly items: readonly AskSource[];
  /** All the matches when more than the cards ("Show all N in search"), else `null`. */
  readonly total: number | null;
  /** The search the feed opens for "Show all", `null` when the feed cannot show it. */
  readonly search: AskSearchFilter | null;
}
