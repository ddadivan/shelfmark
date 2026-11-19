/**
 * What a phrase may point at (#535): the user's live folders (with their path, `A / B`) and tag
 * names. The model sees names only; `parseViewDraftOutput` maps them back by name.
 */
export interface ViewDraftVocabulary {
  folders: { id: string; name: string; path: string }[];
  tags: string[];
}
