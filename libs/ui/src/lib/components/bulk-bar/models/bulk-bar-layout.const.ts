/**
 * How `ui-bulk-bar` lays out its buttons: `inline` (desktop: icon and label side by side, the
 * danger actions after a divider) or `stacked` (phone: icon above the label, the buttons share the
 * width like the tab bar).
 */
export const BULK_BAR_LAYOUT = {
  Inline: 'inline',
  Stacked: 'stacked',
} as const;
