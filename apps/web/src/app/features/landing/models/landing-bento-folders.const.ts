import type { LandingBentoFolder } from './landing-bento-folder.interface';

/** The folder tree of the bento tile: Angular and Courses are nested in Work. */
export const LANDING_BENTO_FOLDERS: readonly LandingBentoFolder[] = [
  { nameKey: 'landing.bento.folders.work', count: 34, depth: 0, active: false },
  { nameKey: 'landing.bento.folders.angular', count: 12, depth: 1, active: true },
  { nameKey: 'landing.bento.folders.courses', count: 8, depth: 1, active: false },
];
