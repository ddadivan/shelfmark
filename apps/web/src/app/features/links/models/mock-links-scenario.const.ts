/** Values of the `sessionStorage` key `MOCK_LINKS_SCENARIO_KEY`: what the mock feed answers. */
export const MOCK_LINKS_SCENARIO = {
  /** The feed has no links. */
  Empty: 'empty',
  /** Listing fails. */
  Error: 'error',
  /** The first link of the feed has a pending image capture until `captureImages` runs. */
  PendingImages: 'pending-images',
} as const;
