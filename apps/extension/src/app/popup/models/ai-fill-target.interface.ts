import type { Signal, WritableSignal } from '@angular/core';
import type { FolderResponse } from '@shelfmark/contracts';

/** The form values "Fill in with AI" reads and fills; they belong to `PopupStore`. */
export interface AiFillTarget {
  readonly folders: Signal<readonly FolderResponse[]>;
  readonly folderId: WritableSignal<string | null>;
  readonly newFolderName: Signal<string | null>;
  readonly chosenTags: WritableSignal<string[]>;
  readonly note: Signal<string>;
}
