/** `POST /api/links/batch/delete` body: Undo of a batch create. */
export interface DeleteLinksBatchRequest {
  /** 1 to `LINK_LIMIT.BatchMax` distinct link ids; foreign or missing ids are ignored. */
  ids: string[];
}
