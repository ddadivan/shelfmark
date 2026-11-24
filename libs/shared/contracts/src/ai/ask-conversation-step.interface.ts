import type { AskActivity } from './ask-activity.type';

/** A finished step of a stored answer: the checked line above the text ("Searched · 6 found"). */
export interface AskConversationStep {
  activity: AskActivity;
  /** How many links a search or count found; `null` for the other activities. */
  found: number | null;
}
