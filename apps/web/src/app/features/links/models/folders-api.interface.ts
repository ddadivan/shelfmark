import type { Observable } from 'rxjs';
import type {
  CreateFolderRequest,
  FolderDeleteMode,
  FolderResponse,
  ListFoldersResponse,
  UpdateFolderRequest,
} from '@shelfmark/contracts';

/**
 * Seam for the folder endpoints (`/api/folders`). The mock and the unavailable placeholder are
 * registered by `provideLinksApi()`; `HttpFoldersApi` is wired in when the API is on main.
 */
export interface FoldersApi {
  /** `GET /api/folders`: every folder as a flat list, plus the counts of the fixed rows. */
  list(): Observable<ListFoldersResponse>;
  /** `POST /api/folders`. */
  create(request: CreateFolderRequest): Observable<FolderResponse>;
  /** `PATCH /api/folders/:id`: rename and / or move. */
  update(id: string, request: UpdateFolderRequest): Observable<FolderResponse>;
  /** `DELETE /api/folders/:id?mode=`: the folder and its subfolders; `mode` decides about the links. */
  remove(id: string, mode: FolderDeleteMode): Observable<void>;
}
