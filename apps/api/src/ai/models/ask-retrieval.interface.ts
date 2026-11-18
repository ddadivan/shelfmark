import type { AskPromptSource } from './ask-prompt-source.interface';

/** What Ask retrieval found for the session user: sources numbered from 1 and their link ids. */
export interface AskRetrieval {
  sources: AskPromptSource[];
  /** `linkIds[n - 1]` is the link of source `n`. */
  linkIds: string[];
  /** For the logs only: how many came from each kind of match. */
  meaningMatches: number;
  wordMatches: number;
}
