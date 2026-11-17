import type { AppliedRule } from './applied-rule.interface';

/** What a domain rule does to one line of the paste-many list, and its chip. */
export interface BatchRuleRow {
  applied: AppliedRule;
  chip: { domain: string; target: string };
}
