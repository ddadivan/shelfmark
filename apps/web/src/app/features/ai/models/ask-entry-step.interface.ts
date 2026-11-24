import type { AskActivity } from '@shelfmark/contracts';

/** A finished step of an answer (an activity that ended): the checked line above the text. */
export interface AskEntryStep {
  readonly activity: AskActivity;
  /** How many links a search or count found; `null` for the other activities. */
  readonly found: number | null;
}
