/** Data of the saved view name dialog. */
export interface ViewNameDialogData {
  /** The view's current name. */
  name: string;
  /**
   * Saves the trimmed name. Resolves `null` on success (the dialog closes), or the translation key
   * of the error to show (the dialog stays open).
   */
  submit(name: string): Promise<string | null>;
}
