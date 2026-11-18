/** What `buildEmbeddingText` reads of a link: never the URL, the folder or other links. */
export interface EmbeddingTextInput {
  title: string;
  tagNames: readonly string[];
  summary: string | null;
  note: string | null;
}
