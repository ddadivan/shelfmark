/** Values of the `sessionStorage` key `MOCK_LINKS_SCENARIO_KEY`: what the mock feed answers. */
export const MOCK_LINKS_SCENARIO = {
  /** The feed has no links. */
  Empty: 'empty',
  /** Listing fails. */
  Error: 'error',
  /** The first link of the feed has a pending image capture until `captureImages` runs. */
  PendingImages: 'pending-images',
  /**
   * Any mock session (a signed-in account or a guest) starts from the demo's mockup library, so
   * a regular account can share one of its folders on video (the promo recorder, #326).
   */
  Showcase: 'showcase',
  /**
   * Every link has a captured preview image (`/api/links/:id/image?v=…`; e2e answers those
   * requests), so the folder cover can be chosen (#418).
   */
  Previews: 'previews',
} as const;
