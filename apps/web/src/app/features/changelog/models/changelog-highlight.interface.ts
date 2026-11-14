import type { ChangelogFeature } from './changelog-feature.interface';

/** A highlighted feature together with the release that brought it ("What's new", `/about`). */
export interface ChangelogHighlight {
  readonly item: ChangelogFeature;
  readonly version: string;
  readonly date: string;
}
