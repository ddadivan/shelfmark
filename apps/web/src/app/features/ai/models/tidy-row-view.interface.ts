import type { LinkResponse } from '@shelfmark/contracts';
import type { TidyChipView } from './tidy-chip-view.interface';

/** One link of the Tidy review page with its chips. */
export interface TidyRowView {
  readonly link: LinkResponse;
  readonly chips: readonly TidyChipView[];
  /** "Skipped — stays in Unsorted": nothing of this link is applied. */
  readonly skipped: boolean;
}
