/** `POST /api/tags` body: creates an empty tag. Unique per user, case-insensitively. */
export interface CreateTagRequest {
  /** 1 to `TAG_LIMIT.NameMax` characters; spaces become hyphens. */
  name: string;
}
