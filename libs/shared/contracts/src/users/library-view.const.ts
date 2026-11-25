/**
 * Settings › Library › Default view: how a feed opens the first time (masonry, cards, list or headlines;
 * Shelf, ADR 0061). After the person switches the view of a feed, the web app remembers that
 * choice for the feed on the device.
 */
export const LIBRARY_VIEW = {
  Masonry: 'masonry',
  Cards: 'cards',
  List: 'list',
  Headlines: 'headlines',
} as const;
