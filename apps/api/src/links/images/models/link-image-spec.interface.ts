/** Target of the re-encode of one image kind (ADR 0027). */
export interface LinkImageSpec {
  width: number;
  height: number;
  /** `cover` crops to the box (preview), `contain` letterboxes on transparency (icon). */
  fit: 'cover' | 'contain';
  /** The stored copy is dropped above this size. */
  maxBytes: number;
  /** WebP qualities tried in order until the copy fits `maxBytes`. */
  qualities: readonly number[];
}
