import type { LandingFolder } from './landing-folder.type';

/** One folder row of a drawn folder tree (the bento tile, the "after" shelf). */
export interface LandingTreeRow {
  readonly folder: LandingFolder;
  readonly count: number;
  /** A subfolder: indented under the row above. */
  readonly nested?: boolean;
  /** The selected row. */
  readonly current?: boolean;
}
