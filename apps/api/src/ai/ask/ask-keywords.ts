import { wordStems } from '../search/word-stems';
import { ASK_RETRIEVAL_LIMIT } from '../models/ask-retrieval-limit.const';

/** Question words that say nothing about the topic (after `wordStems` drops the common ones). */
const QUESTION_WORDS: ReadonlySet<string> = new Set([
  'which',
  'did',
  'does',
  'have',
  'has',
  'had',
  'sav',
  'save',
  'saved',
  'link',
  'any',
  'some',
  'all',
  'mine',
  'tell',
  'know',
  'find',
  'show',
  'there',
  'where',
  'when',
  'who',
  'can',
  'could',
  'should',
  'would',
  'you',
  'they',
  'them',
  'their',
  'were',
  'been',
  'kept',
  'thing',
  'stuff',
]);

/** The topic words of a question for the word matches: stems, question words dropped, a few at most. */
export function askKeywords(question: string): string[] {
  return wordStems(question)
    .filter((stem) => !QUESTION_WORDS.has(stem))
    .slice(0, ASK_RETRIEVAL_LIMIT.KeywordsMax);
}
