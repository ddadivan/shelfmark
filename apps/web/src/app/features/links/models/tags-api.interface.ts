import type { Observable } from 'rxjs';
import type { TagResponse } from '@shelfmark/contracts';

/** Read seam for `GET /api/tags`. The tags feature (#76) provides the real one behind `TAGS_API`. */
export interface TagsApi {
  list(): Observable<readonly TagResponse[]>;
}
