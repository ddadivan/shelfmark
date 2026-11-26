import type { LandingFolder } from './landing-folder.type';

/** One folder row of the app preview's sidebar. */
export interface LandingPreviewRow {
  readonly scope: LandingFolder;
  readonly count: number;
  /** The folder tile colour (`FOLDER_COLOUR`). */
  readonly colour: string;
  /** Subfolders shown under the row (collapsed). */
  readonly children?: readonly { readonly scope: LandingFolder; readonly count: number }[];
}
