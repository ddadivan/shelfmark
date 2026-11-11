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
}
