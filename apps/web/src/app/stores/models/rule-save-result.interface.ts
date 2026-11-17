import type { RuleResponse } from '@shelfmark/contracts';
import type { RuleOutcome } from './rule-outcome.type';

/** The answer of a rule create or edit: the outcome and, when done, the saved rule. */
export interface RuleSaveResult {
  outcome: RuleOutcome;
  rule?: RuleResponse;
}
