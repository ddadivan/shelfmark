import type { ChangelogHighlight } from './changelog-highlight.interface';

/** What the "What's new" dialog shows. */
export interface WhatsNewDialogData {
  readonly highlights: readonly ChangelogHighlight[];
}
