import type { ChangelogItem } from './changelog-item.type';

/** One release of Shelfmark in the changelog data. */
export interface ChangelogRelease {
  /** SemVer of the release (`2.1.0`); the root `package.json` version when it shipped. */
  readonly version: string;
  /**
   * ISO date (yyyy-mm-dd) the release reached production, or `null` for the next release while it
   * is being built: such an entry is hidden everywhere until the release PR sets its date.
   */
  readonly date: string | null;
  readonly items: readonly ChangelogItem[];
}
