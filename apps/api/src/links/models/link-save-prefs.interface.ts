/** The Settings › Library choices that change how a link is saved (#284). */
export interface LinkSavePrefs {
  /** Off: no page fetch and no image capture for a new link; it keeps only its address. */
  fetchPreviews: boolean;
  /** Off: tracking parameters are removed from the address on save. */
  keepQuery: boolean;
}
