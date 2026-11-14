import type { LinkResponse } from '@shelfmark/contracts';

/** The feed and the recent list before an optimistic bulk change, to roll it back. */
export interface LinksSnapshot {
  readonly entities: readonly LinkResponse[];
  readonly recent: readonly LinkResponse[];
  /** The view it belongs to: a rollback after a view change or a sign-out is dropped. */
  readonly generation: number;
  readonly epoch: number;
}
