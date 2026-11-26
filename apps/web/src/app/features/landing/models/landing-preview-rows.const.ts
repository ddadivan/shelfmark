import { LANDING_FOLDER } from './landing-folder.const';
import type { LandingPreviewRow } from './landing-preview-row.interface';

/** The app preview's Folders tree (16-landing); the library rows come from the shell's own nodes. */
export const LANDING_PREVIEW_ROWS: readonly LandingPreviewRow[] = [
  { scope: LANDING_FOLDER.Angular, count: 2, colour: 'clay' },
  { scope: LANDING_FOLDER.Tools, count: 4, colour: 'ocean' },
  {
    scope: LANDING_FOLDER.Learning,
    count: 6,
    colour: 'sage',
    children: [
      { scope: LANDING_FOLDER.Courses, count: 4 },
      { scope: LANDING_FOLDER.Talks, count: 2 },
    ],
  },
  { scope: LANDING_FOLDER.Shopping, count: 4, colour: 'rose' },
  { scope: LANDING_FOLDER.WatchLater, count: 1, colour: 'plum' },
];
