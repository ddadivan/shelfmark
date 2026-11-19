import type { AskEscalationReason } from './ask-escalation-reason.type';
import type { AskSearchRecord } from './ask-search-record.interface';

/** The result of one Ask tool call: what the model reads, and what the loop needs to know. */
export interface AskToolOutcome {
  /** An `is_error` result the model can correct. */
  isError: boolean;
  /** JSON-serialisable result, or the fixed error message. */
  data: unknown;
  /** Links found or counted (the `activity` end event), else `null`. */
  found: number | null;
  /** `search_links` only. */
  search?: AskSearchRecord;
  /** `show_links` only: refs to show as cards. */
  show?: number[];
  /** `request_deeper_answer` only. */
  escalate?: AskEscalationReason;
}
