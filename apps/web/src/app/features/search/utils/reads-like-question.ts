import { QUESTION_WORDS } from '../models/question-words.const';

/** Fewer words than this read as a search, even when they start with a question word ("how to"). */
const MIN_WORDS = 3;

/**
 * Whether a search text reads like a question (Shelf search offers Ask for it): it ends with a
 * question mark ("?", or the Spanish "¿…?"), or it has at least three words and starts with a
 * question word of one of the app languages (`QUESTION_WORDS`).
 */
export function readsLikeQuestion(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  if (trimmed === '') {
    return false;
  }
  if (trimmed.endsWith('?') || trimmed.startsWith('¿')) {
    return trimmed.replace(/[¿?\s]/gu, '') !== '';
  }
  const words = trimmed.split(/\s+/u);
  if (words.length < MIN_WORDS) {
    return false;
  }
  const twoWords = `${words[0]} ${words[1]}`;
  return QUESTION_WORDS.includes(words[0] ?? '') || QUESTION_WORDS.includes(twoWords);
}
