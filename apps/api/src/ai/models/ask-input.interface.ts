import type { AskPromptSource } from './ask-prompt-source.interface';

/** What a provider gets for one Ask answer (server-only, never stored or logged). */
export interface AskInput {
  /** Normalised question (trimmed, whitespace collapsed). */
  question: string;
  /** At most `ASK_LIMIT.ContextLinksMax`, numbered from 1. */
  sources: AskPromptSource[];
  /** "Include my notes": the sources carry notes only when true. */
  includeNotes: boolean;
}
