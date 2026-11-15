import { RULE_OUTCOME } from '../../../stores/models/rule-outcome.const';
import type { RuleOutcome } from '../../../stores/models/rule-outcome.type';

/** Translation key of the dialog notice for each failed rule write. */
export const RULE_OUTCOME_KEYS: Readonly<
  Record<Exclude<RuleOutcome, typeof RULE_OUTCOME.Done>, string>
> = {
  [RULE_OUTCOME.Taken]: 'rules.dialog.taken',
  [RULE_OUTCOME.Limit]: 'rules.dialog.limit',
  [RULE_OUTCOME.MissingFolder]: 'rules.dialog.missingFolder',
  [RULE_OUTCOME.Missing]: 'rules.dialog.missing',
  [RULE_OUTCOME.Failed]: 'rules.dialog.failed',
};
