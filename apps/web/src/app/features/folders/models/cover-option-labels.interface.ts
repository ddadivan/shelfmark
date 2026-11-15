/** Translated names of the cover choices (#418). */
export interface CoverOptionLabels {
  readonly none: string;
  /** The chosen cover when its link is not among the ones offered. */
  readonly current: string;
  /** "Cover from “{title}”". */
  readonly option: (title: string) => string;
}
