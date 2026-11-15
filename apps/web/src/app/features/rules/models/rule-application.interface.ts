import type { AppliedRule } from './applied-rule.interface';
import type { RuleFields } from './rule-fields.interface';

/** The fields of a save form after a rule went in, and what it applied. */
export interface RuleApplication {
  fields: RuleFields;
  applied: AppliedRule;
}
