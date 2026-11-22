import type { Signal } from '@angular/core';
import type { FolderResponse } from '@shelfmark/contracts';

/** The shared values "Sort with AI" for tabs reads; they belong to `PopupStore`. */
export interface TabsAiTarget {
  readonly folders: Signal<readonly FolderResponse[]>;
  /** The folder of the Folder field (for the links AI gave none, and when "Keep AI picks" is off). */
  readonly folderId: Signal<string | null>;
}
