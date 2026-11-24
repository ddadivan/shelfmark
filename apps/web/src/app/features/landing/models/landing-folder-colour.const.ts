import type { LandingFolder } from './landing-folder.type';

/** The Shelf folder colour token (`--folder-<colour>`) of each landing folder. */
export const LANDING_FOLDER_COLOUR: Readonly<Record<LandingFolder, string>> = {
  angular: 'var(--folder-clay)',
  tools: 'var(--folder-ocean)',
  learning: 'var(--folder-sage)',
  shopping: 'var(--folder-rose)',
  watchLater: 'var(--folder-plum)',
  courses: 'var(--folder-sage)',
  talks: 'var(--folder-sage)',
};
