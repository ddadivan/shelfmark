import type { CHANGELOG_ITEM_KIND } from './changelog-item-kind.const';
import type { ChangelogImage } from './changelog-image.interface';

/** A feature of a release: a title and a short text (keys under `changelog.items.<id>`). */
export interface ChangelogFeature {
  readonly kind: typeof CHANGELOG_ITEM_KIND.Feature;
  readonly id: string;
  readonly titleKey: string;
  readonly textKey: string;
  /**
   * Place in the "What's new" card, 1 is the most important (shown first and large). Set only on
   * the features the card should show, with no duplicate inside a release; a feature without it
   * stays on `/changelog`. `/about` lists the same features in the same order.
   */
  readonly priority?: number;
  /** Optional screenshot, shown on `/changelog` and, for priority 1, in the "What's new" card. */
  readonly image?: ChangelogImage;
}
