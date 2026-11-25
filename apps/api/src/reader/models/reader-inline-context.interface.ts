import type { ReaderWalkOptions } from './reader-walk-options.interface';

/** What an inline or code walk needs: the pass options, the page address and a node budget. */
export interface ReaderInlineContext {
  options: ReaderWalkOptions;
  /** The page's address for relative links; `null` drops relative links. */
  base: URL | null;
  /** Nodes visited by every walk of this extraction so far (shared, bounded by `NodesMax`). */
  visited: { count: number };
}
