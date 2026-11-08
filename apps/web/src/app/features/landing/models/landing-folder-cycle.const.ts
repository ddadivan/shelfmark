import { LANDING_FOLDER } from './landing-folder.const';
import type { LandingFolder } from './landing-folder.type';

/** Folders the "after" shelf shows, in order; Work only holds a subfolder, so it is skipped. */
export const LANDING_FOLDER_CYCLE: readonly LandingFolder[] = [
  LANDING_FOLDER.Clothes,
  LANDING_FOLDER.Angular,
  LANDING_FOLDER.Recipes,
];
