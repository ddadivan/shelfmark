import { LANDING_FOLDER } from './landing-folder.const';
import type { LandingTreeRow } from './landing-tree-row.interface';

/** The bento's "Folders inside folders" tree: Learning with two subfolders, then Shopping. */
export const LANDING_BENTO_TREE: readonly LandingTreeRow[] = [
  { folder: LANDING_FOLDER.Learning, count: 6 },
  { folder: LANDING_FOLDER.Courses, count: 3, nested: true, current: true },
  { folder: LANDING_FOLDER.Talks, count: 2, nested: true },
  { folder: LANDING_FOLDER.Shopping, count: 4 },
];
