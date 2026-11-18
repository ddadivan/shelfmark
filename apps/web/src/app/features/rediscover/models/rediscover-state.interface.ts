import type { RediscoverResponse } from '@shelfmark/contracts';

/**
 * `RediscoverStore`: this week's block once loaded (`null` before, or after a failed load) and
 * whether the load has finished (`loaded`, also after a failure).
 */
export interface RediscoverState {
  readonly block: RediscoverResponse | null;
  readonly loaded: boolean;
}
