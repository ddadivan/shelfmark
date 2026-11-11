import type { FolderColour, FolderIcon } from '@shelfmark/contracts';
import type { DemoFolderKey } from './demo-folder-key.type';

/** One folder of the demo library. */
export interface DemoSeedFolder {
  key: DemoFolderKey;
  parent: DemoFolderKey | null;
  name: string;
  colour: FolderColour;
  icon: FolderIcon;
  /** Pinned to the sidebar. */
  pinned?: true;
}
