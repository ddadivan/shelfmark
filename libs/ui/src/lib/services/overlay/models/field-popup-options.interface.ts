/** What a `FieldPopup` needs from its component (read lazily: view queries resolve later). */
export interface FieldPopupOptions {
  /** The element the pane hangs under and takes its width from (the field box or trigger). */
  origin(): HTMLElement;
  /** The popup element moved into the pane. */
  popup(): HTMLElement;
  /** The popup should be on screen: the pane is released after a hide only while this is false. */
  isShown(): boolean;
  /** The pane is exactly as wide as the origin (`width`); otherwise at least as wide (`min-width`). */
  exactWidth?: boolean;
  /** The pane was detached from outside (scroll strategy, overlay closed): after `attached` is cleared. */
  onDetached?(): void;
  /** Remove the popup element on destroy (the pane may still hold it, Angular no longer does); default `true`. */
  ownsPopup?(): boolean;
}
