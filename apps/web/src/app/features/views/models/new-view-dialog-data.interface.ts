import type { SavedViewQuery } from '@shelfmark/contracts';

/** Data of the new view dialog. */
export interface NewViewDialogData {
  /** The filter the rows start from: what "Save this view" stores for the feed the user is on. */
  query: SavedViewQuery;
  /**
   * Saves the view. Resolves `null` on success (the dialog closes), or the translation key of the
   * error to show (the dialog stays open).
   */
  submit(name: string, query: SavedViewQuery): Promise<string | null>;
}
