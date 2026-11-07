import type { Observable } from 'rxjs';
import type { FolderResponse } from '@shelfmark/contracts';

/** Read seam for `GET /api/folders` (flat list). The folders feature (#75) provides the real one behind `FOLDERS_API`. */
export interface FoldersApi {
  list(): Observable<readonly FolderResponse[]>;
}
