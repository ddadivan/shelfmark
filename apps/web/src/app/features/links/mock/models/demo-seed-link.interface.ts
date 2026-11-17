import type { LinkKind } from '@shelfmark/contracts';
import type { DemoFolderKey } from './demo-folder-key.type';

/** One link of the demo library, dated by days before now. */
export interface DemoSeedLink {
  /** Key of the folder it lives in; `null` = Unsorted. */
  folder: DemoFolderKey | null;
  url: string;
  title: string;
  kind: LinkKind;
  tags: readonly string[];
  /** Saved this many days ago. */
  daysAgo: number;
  /** Opened this many days ago; `null` = never opened. */
  openedDaysAgo: number | null;
  favorite?: true;
  note?: string;
  /** AI summary (#391), shown with the AI mark; the demo starts with AI on (author's answer 5). */
  summary?: string;
  /** A pending AI folder suggestion (Unsorted links only). */
  suggestFolder?: DemoFolderKey;
  /** Pending AI tag suggestions; a name that is not a tag yet is a new-tag suggestion. */
  suggestTags?: readonly string[];
  /** Pinned to the sidebar (the "Pinned" section of the Main mockup). */
  pinned?: true;
  /** Pinned to the top of its folder (the card with the "Pinned" badge). */
  pinnedToTop?: true;
  /** Reminder (#275) this many hours from now; negative = already due. */
  remindInHours?: number;
}
