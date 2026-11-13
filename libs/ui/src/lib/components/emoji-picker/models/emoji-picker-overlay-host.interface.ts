/** What `EmojiPickerOverlay` needs from `ui-emoji-picker`. */
export interface EmojiPickerOverlayHost {
  /** The component's host element (the field box anchors the panel). */
  readonly element: HTMLElement;
  /** The text field, where focus returns. */
  field(): HTMLInputElement;
  /** The element moved into the overlay pane. */
  popup(): HTMLElement;
  /** The open panel, `undefined` while closed. */
  panel(): HTMLElement | undefined;
  /** Runs on every close (the field's `touch`). */
  onClosed(): void;
}
