import type { CHANGELOG_ITEM_KIND } from './changelog-item-kind.const';

/** A small improvement: one line of text on `/changelog` only (`changelog.items.<id>.text`). */
export interface ChangelogImprovement {
  readonly kind: typeof CHANGELOG_ITEM_KIND.Improvement;
  readonly id: string;
  readonly textKey: string;
}
