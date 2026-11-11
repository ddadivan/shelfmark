/** One sample card of `ui-theme-preview`; all text is already translated. */
export interface ThemePreviewCard {
  readonly site: string;
  readonly title: string;
  /** The note under the title; none without it. */
  readonly note?: string;
  readonly tag: string;
}
