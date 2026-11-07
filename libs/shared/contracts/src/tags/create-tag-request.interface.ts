/**
 * `POST /api/tags` body: creates an empty tag. Unique per user, case-insensitively: 409 when the
 * name exists or `TAG_LIMIT.PerUserMax` is reached.
 */
export interface CreateTagRequest {
  /** 1 to `TAG_LIMIT.NameMax` characters; spaces become hyphens. */
  name: string;
}
