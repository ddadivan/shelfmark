import { LANDING_FOLDER } from './landing-folder.const';
import type { LandingTreeRow } from './landing-tree-row.interface';

/** The "after" shelf's folder tree, Shopping open. */
export const LANDING_SHELF_TREE: readonly LandingTreeRow[] = [
  { folder: LANDING_FOLDER.Angular, count: 2 },
  { folder: LANDING_FOLDER.Tools, count: 4 },
  { folder: LANDING_FOLDER.Learning, count: 6 },
  { folder: LANDING_FOLDER.Shopping, count: 4, current: true },
  { folder: LANDING_FOLDER.WatchLater, count: 1 },
];
