import { LANDING_FOLDER } from './landing-folder.const';
import { LANDING_PREVIEW_KIND } from './landing-preview-kind.const';
import { LANDING_PREVIEW_SCOPE } from './landing-preview-scope.const';
import type { LandingPreviewState } from './landing-preview-state.interface';

/** The app preview's cycle (16-landing): All links › All, › Videos, Shopping, Favorites, Watch later. */
export const LANDING_PREVIEW_STATES: readonly LandingPreviewState[] = [
  { scope: LANDING_PREVIEW_SCOPE.All, tab: 'all' },
  { scope: LANDING_PREVIEW_SCOPE.All, tab: LANDING_PREVIEW_KIND.Video },
  { scope: LANDING_FOLDER.Shopping, tab: 'all' },
  { scope: LANDING_PREVIEW_SCOPE.Favorites, tab: 'all' },
  { scope: LANDING_FOLDER.WatchLater, tab: 'all' },
];
