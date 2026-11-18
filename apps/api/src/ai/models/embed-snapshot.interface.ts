/**
 * What one link's embedded text was built from when the embed pass read it (AI-3): the write
 * compares it with the current rows, so a change during the provider call stores the vector as
 * stale. `tags` is the JSON array of the tag names sent.
 */
export interface EmbedSnapshot {
  readonly title: string;
  readonly note: string | null;
  readonly summary: string | null;
  readonly tags: string;
}
