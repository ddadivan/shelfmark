import type { RuleFields } from './rule-fields.interface';

/** How a save form plugs into `RuleSuggestionService`: its address, its fields and its locks. */
export interface RuleSuggestionSource {
  /** The address as it will be saved (a signal read, so a new address re-matches). */
  url(): string;
  read(): RuleFields;
  put(fields: RuleFields): void;
  /** Whether the user chose the folder or the tags themselves (read when a rule applies). */
  locked(): { folder: boolean; tags: boolean };
}
