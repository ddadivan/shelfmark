import type { CHANGELOG_ITEM_KIND } from './changelog-item-kind.const';
import type { ChangelogImage } from './changelog-image.interface';
import type { ChangelogVideo } from './changelog-video.interface';

/** A feature of a release: a title and a short text (keys under `changelog.items.<id>`). */
export interface ChangelogFeature {
  readonly kind: typeof CHANGELOG_ITEM_KIND.Feature;
  readonly id: string;
  readonly titleKey: string;
  readonly textKey: string;
  /** Worth telling people about: it shows in the "What's new" card and on `/about`. */
  readonly highlight: boolean;
  /** Optional picture in the "What's new" card. */
  readonly image?: ChangelogImage;
  /** Optional loop in the "What's new" card (at most one per release, the most visual feature). */
  readonly video?: ChangelogVideo;
}
