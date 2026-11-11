import type { FolderShareResponse } from '@shelfmark/contracts';
import type { ShareError } from './share-error.type';

/** State of `FolderShareStore`: the public link of the folder the dialog shows. */
export interface FolderShareState {
  folderId: string | null;
  share: FolderShareResponse | null;
  loading: boolean;
  /** A change is on its way; the controls wait for it. */
  busy: boolean;
  error: ShareError | null;
}
