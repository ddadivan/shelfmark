/** Ids of the destinations of the mobile-shell tab bar (Add is the bar's own button, not a tab). */
export const PHONE_TAB = {
  /** Today (Shelf): the first tab. */
  Today: 'today',
  Library: 'library',
  Search: 'search',
  /** Shown in the last place while Ask is off. */
  Tags: 'tags',
  /** Ask your shelf: the last tab while Ask is on (#499). */
  Ask: 'ask',
  /**
   * The settings pages. No longer a tab (Shelf: settings sit behind the avatar of the top bar);
   * the id still tells the shell that a settings page is open.
   */
  You: 'you',
} as const;
