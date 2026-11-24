import type { SaveOutcome } from './save-outcome.type';

/** A finished right-click save: the outcome and, for Saved / Already saved, the folder's name. */
export interface SaveResult {
  outcome: SaveOutcome;
  /** The folder's name; `null` for Unsorted or when the outcome has no folder. */
  folderName: string | null;
}
