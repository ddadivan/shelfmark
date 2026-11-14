import type { RuleResponse } from '@shelfmark/contracts';

/** What the rule dialog opens with: the rule to edit, or a domain to prefill a new one. */
export interface RuleDialogData {
  readonly rule?: RuleResponse;
  /** Prefilled domain of a new rule ("Create a rule for youtube.com…" from a link menu). */
  readonly domain?: string;
}
