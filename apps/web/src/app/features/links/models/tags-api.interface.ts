import type { Observable } from 'rxjs';
import type {
  CreateTagRequest,
  MergeTagResponse,
  TagResponse,
  UpdateTagRequest,
} from '@shelfmark/contracts';

/**
 * Seam for the tag endpoints (`/api/tags`). The mock and the unavailable placeholder are
 * registered by `provideLinksApi()`; `HttpTagsApi` is wired in when the API is on main.
 * A duplicate name (case-insensitive) fails with an `HttpErrorResponse` of status 409.
 */
export interface TagsApi {
  /** `GET /api/tags`: every tag with its link count, most used first. */
  list(): Observable<readonly TagResponse[]>;
  /** `POST /api/tags`: an empty tag. */
  create(request: CreateTagRequest): Observable<TagResponse>;
  /** `PATCH /api/tags/:id`: rename. */
  update(id: string, request: UpdateTagRequest): Observable<TagResponse>;
  /** `DELETE /api/tags/:id`: the tag leaves its links; the links stay. */
  remove(id: string): Observable<void>;
  /** `POST /api/tags/:id/merge`: the links of `id` move to `targetTagId`, `id` is deleted. */
  merge(id: string, targetTagId: string): Observable<MergeTagResponse>;
}
