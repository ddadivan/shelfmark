/**
 * One view-from-a-phrase request to the model (#535, ADR 0057): the phrase, the user's live folder
 * paths and tag names (most used first). Never ids, links, URLs or notes.
 */
export interface ViewDraftInput {
  phrase: string;
  folders: string[];
  tags: string[];
}
