/** A tab of `ui-tab-bar` was chosen. */
export interface TabBarSelection {
  readonly id: string;
  /** Plain left click: call `preventDefault()` to route in the app instead of navigating. */
  readonly event: MouseEvent;
}
