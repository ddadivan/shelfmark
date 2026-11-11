import type { ViewNameMode } from './view-name-mode.type';

/** Data of the saved view name dialog. */
export interface ViewNameDialogData {
  mode: ViewNameMode;
  /** The current name (empty for a new view). */
  name: string;
  /**
   * Saves the trimmed name. Resolves `null` on success (the dialog closes), or the translation key
   * of the error to show (the dialog stays open).
   */
  submit(name: string): Promise<string | null>;
}
