import type { RULE_OUTCOME } from './rule-outcome.const';

export type RuleOutcome = (typeof RULE_OUTCOME)[keyof typeof RULE_OUTCOME];
