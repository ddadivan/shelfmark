import type { ImportGroup } from './import-group.interface';

/** `POST /api/imports/groups` response. */
export interface ImportGroupsResponse {
  /** Largest first, at most `IMPORT_LIMIT.GroupsMax`. */
  groups: ImportGroup[];
  /** Indexes that fit no topic ("Other"): they go to the import's target. */
  rest: number[];
  /** Links taken from the backfill allowance for this grouping and the AI pass of its import. */
  charged: number;
}
