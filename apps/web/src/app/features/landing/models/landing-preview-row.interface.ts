import type { LandingPreviewScope } from './landing-preview-scope.type';

/** One row of the app preview's sidebar. */
export interface LandingPreviewRow {
  readonly scope: LandingPreviewScope;
  readonly count: number;
  /** A folder row (folder glyph in its colour, under the Folders heading). */
  readonly folder: boolean;
  /** The count is news (Today's due reminders): full colour, semibold. */
  readonly strong?: boolean;
}
