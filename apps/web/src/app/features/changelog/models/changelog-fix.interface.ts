import type { CHANGELOG_ITEM_KIND } from './changelog-item-kind.const';

/** A hotfix or small fix: one line of text on `/changelog` only (`changelog.items.<id>.text`). */
export interface ChangelogFix {
  readonly kind: typeof CHANGELOG_ITEM_KIND.Fix;
  readonly id: string;
  readonly textKey: string;
}
