import type { LinkResponse } from '@shelfmark/contracts';

/** State of `RemindersStore`. */
export interface RemindersState {
  /** Due links, the longest due first (the API list). */
  due: LinkResponse[];
  /** Upcoming reminders, the soonest first. */
  upcoming: LinkResponse[];
  /** How many links are due: the sidebar badge. */
  dueCount: number;
  /** The count has arrived at least once. */
  countLoaded: boolean;
  /** The first list has arrived. */
  loaded: boolean;
  loading: boolean;
  /** The first list failed; the page offers a retry. */
  error: boolean;
}
