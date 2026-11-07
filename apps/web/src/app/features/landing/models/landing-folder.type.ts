import type { LANDING_FOLDER } from './landing-folder.const';

export type LandingFolder = (typeof LANDING_FOLDER)[keyof typeof LANDING_FOLDER];
