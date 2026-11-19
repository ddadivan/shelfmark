import { VIEW_DRAFT_LIMIT } from '@shelfmark/contracts';

/** The phrase as the API reads it: white space collapsed, trimmed. */
export function normalizePhrase(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** The phrase is long enough and short enough to send. */
export function isPhraseValid(text: string): boolean {
  const length = normalizePhrase(text).length;
  return length >= VIEW_DRAFT_LIMIT.PhraseMin && length <= VIEW_DRAFT_LIMIT.PhraseMax;
}
