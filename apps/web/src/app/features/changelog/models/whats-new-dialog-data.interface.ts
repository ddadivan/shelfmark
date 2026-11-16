import type { ChangelogHighlight } from './changelog-highlight.interface';

/** What the "What's new" dialog shows. */
export interface WhatsNewDialogData {
  /** In priority order: the first one is shown large, the others as small cards. */
  readonly highlights: readonly ChangelogHighlight[];
  /** Other changes of the same releases that the card leaves out ("And N more…"). */
  readonly moreCount: number;
}
