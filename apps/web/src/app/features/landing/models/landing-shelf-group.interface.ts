import type { LandingLinkEntry } from './landing-link-entry.interface';

/** A folder of the hero shelf with the links that landed in it. */
export interface LandingShelfGroup {
  readonly id: string;
  /** Translation key of the folder path. */
  readonly folderKey: string;
  readonly links: readonly LandingLinkEntry[];
}
