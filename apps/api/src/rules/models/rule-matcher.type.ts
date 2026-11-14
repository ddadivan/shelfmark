import type { RuleEffect } from './rule-effect.interface';

/** The rule effect for a link's URL, or `null` when no rule matches. */
export type RuleMatcher = (url: string) => RuleEffect | null;
