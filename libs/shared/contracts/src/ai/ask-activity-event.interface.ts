import type { AskActivity } from './ask-activity.type';
import type { AskActivityPhase } from './ask-activity-phase.type';
import type { ASK_EVENT_TYPE } from './ask-event-type.const';

/** A status change while Ask works (the status pill); never the tool or its arguments. */
export interface AskActivityEvent {
  type: typeof ASK_EVENT_TYPE.Activity;
  activity: AskActivity;
  phase: AskActivityPhase;
  /** On `end` of a search or count: how many links were found or counted; otherwise `null`. */
  found: number | null;
}
