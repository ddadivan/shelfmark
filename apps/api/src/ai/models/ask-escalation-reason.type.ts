import type { ASK_ESCALATION_REASON } from './ask-escalation-reason.const';

/** One of `ASK_ESCALATION_REASON`. */
export type AskEscalationReason =
  (typeof ASK_ESCALATION_REASON)[keyof typeof ASK_ESCALATION_REASON];
