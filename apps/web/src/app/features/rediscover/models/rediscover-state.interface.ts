import type { RediscoverResponse } from '@shelfmark/contracts';

/** `RediscoverStore`: this week's block once loaded (`null` before, or after a failed load). */
export interface RediscoverState {
  readonly block: RediscoverResponse | null;
}
