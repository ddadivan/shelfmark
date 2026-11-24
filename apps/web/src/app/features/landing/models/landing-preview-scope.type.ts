import type { LandingFolder } from './landing-folder.type';
import type { LANDING_PREVIEW_SCOPE } from './landing-preview-scope.const';

/** A row of the preview's sidebar: a library row or a folder. */
export type LandingPreviewScope =
  (typeof LANDING_PREVIEW_SCOPE)[keyof typeof LANDING_PREVIEW_SCOPE] | LandingFolder;
