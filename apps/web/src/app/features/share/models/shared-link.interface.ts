/** What the Web Share Target query carries once it is sanitised. */
export interface SharedLink {
  /** The first http(s) URL found, normalised; `null` when there is none (nothing to save). */
  readonly url: string | null;
  /** The shared `title`, cleaned and capped; only an initial title hint, may be empty. */
  readonly titleHint: string;
}
