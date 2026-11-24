import type { SavedViewIcon, SavedViewQuery } from '@shelfmark/contracts';

/** Data of the new view dialog (also Edit view… of an existing view). */
export interface NewViewDialogData {
  /** The filter the rows start from: what "Save this view" stores for the feed the user is on. */
  query: SavedViewQuery;
  /** Edit view…: the view's name and icon fill the form, the title and action say "Edit". */
  edit?: { name: string; icon: SavedViewIcon | null };
  /**
   * Saves the view. Resolves `null` on success (the dialog closes), or the translation key of the
   * error to show (the dialog stays open).
   */
  submit(name: string, query: SavedViewQuery, icon: SavedViewIcon | null): Promise<string | null>;
}
