import type { AskToolLink } from './ask-tool-link.interface';

/** An earlier turn after hydration: markers rewritten to this question's refs, links re-read live. */
export interface AskHistoryTurn {
  question: string;
  /** The answer with `[ref]` markers of this question; markers of dropped links removed. */
  answer: string;
  /** The turn's live links of the session user, as the model sees them. */
  links: AskToolLink[];
}
