/** One "what cards show" switch of `ui-view-menu` (Note, Hashtags, Folder, Date). */
export interface ViewMenuField {
  /** Stable key, returned in `fieldChange`. */
  readonly id: string;
  /** Visible row text and the accessible name of the switch. */
  readonly label: string;
  readonly checked: boolean;
}
