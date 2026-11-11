import type { Observable } from 'rxjs';
import type {
  FolderShareResponse,
  PublicCollectionQuery,
  PublicCollectionResponse,
} from '@shelfmark/contracts';

/** Seam for the public collection endpoints (#276): the owner's share settings and the public page. */
export interface SharesApi {
  /** `GET /api/folders/:id/share`. */
  get(folderId: string): Observable<FolderShareResponse>;
  /** `POST /api/folders/:id/share`: turns the public link on (idempotent). */
  enable(folderId: string): Observable<FolderShareResponse>;
  /** `PATCH /api/folders/:id/share`. */
  setShowNotes(folderId: string, showNotes: boolean): Observable<FolderShareResponse>;
  /** `POST /api/folders/:id/share/reset`: a new token; the old link stops working. */
  reset(folderId: string): Observable<FolderShareResponse>;
  /** `DELETE /api/folders/:id/share`. */
  disable(folderId: string): Observable<void>;
  /** `GET /api/public/collections/:token`: anonymous; an unknown token fails with 404. */
  collection(token: string, query: PublicCollectionQuery): Observable<PublicCollectionResponse>;
}
