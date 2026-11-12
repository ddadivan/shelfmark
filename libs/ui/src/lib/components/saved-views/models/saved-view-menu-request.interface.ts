/** Emitted by `ui-saved-views` when a chip's menu is asked for: open `ui-menu` from `origin`. */
export interface SavedViewMenuRequest {
  id: string;
  /** The "…" button, or the chip itself for a context menu; pass it to `menu.openFrom`. */
  origin: HTMLElement;
}
