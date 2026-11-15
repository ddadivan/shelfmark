import type { RuleResponse } from '@shelfmark/contracts';

/** State of `RulesStore`: the rules sorted by domain and the load status. */
export interface RulesState {
  items: RuleResponse[];
  loaded: boolean;
  loading: boolean;
  error: boolean;
}
