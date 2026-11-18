import type { AiSearchState } from './ai-search-state.type';

/** Readiness of search by meaning ("N of M links ready"). */
export interface AiSearchStatus {
  state: AiSearchState;
  /** Live links with a current vector. */
  ready: number;
  /** Live links. */
  total: number;
}
