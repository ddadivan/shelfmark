import { LANDING_FOLDER } from './landing-folder.const';
import type { LandingPreviewRow } from './landing-preview-row.interface';
import { LANDING_PREVIEW_SCOPE } from './landing-preview-scope.const';

/** The app preview's sidebar: the library rows, then the folders (16-landing). */
export const LANDING_PREVIEW_ROWS: readonly LandingPreviewRow[] = [
  { scope: LANDING_PREVIEW_SCOPE.All, count: 17, folder: false },
  { scope: LANDING_PREVIEW_SCOPE.Unsorted, count: 3, folder: false },
  { scope: LANDING_PREVIEW_SCOPE.Favorites, count: 3, folder: false },
  { scope: LANDING_PREVIEW_SCOPE.Today, count: 3, folder: false, strong: true },
  { scope: LANDING_FOLDER.Angular, count: 2, folder: true },
  { scope: LANDING_FOLDER.Tools, count: 4, folder: true },
  { scope: LANDING_FOLDER.Learning, count: 6, folder: true },
  { scope: LANDING_FOLDER.Shopping, count: 4, folder: true },
  { scope: LANDING_FOLDER.WatchLater, count: 1, folder: true },
];
