import { LANDING_FOLDER } from './landing-folder.const';
import type { LandingTreeRow } from './landing-tree-row.interface';

/** Rows of the folder tree in the "after" scene, in display order; Angular is nested in Work. */
export const LANDING_TREE_ROWS: readonly LandingTreeRow[] = [
  { id: LANDING_FOLDER.Clothes, nameKey: 'landing.after.folders.clothes', depth: 0 },
  { id: LANDING_FOLDER.Work, nameKey: 'landing.after.folders.work', depth: 0 },
  { id: LANDING_FOLDER.Angular, nameKey: 'landing.after.folders.angular', depth: 1 },
  { id: LANDING_FOLDER.Recipes, nameKey: 'landing.after.folders.recipes', depth: 0 },
];
