/**
 * Where an empty state sits:
 * `inline` is the plain block inside a section (settings lists, dialogs);
 * `page` is the page-level state: a surface card that fills the free height of the page column,
 * with a larger scene and heading centred in it both ways (Trash, Recently opened, library feeds).
 */
export const EMPTY_STATE_LAYOUT = {
  Inline: 'inline',
  Page: 'page',
} as const;
