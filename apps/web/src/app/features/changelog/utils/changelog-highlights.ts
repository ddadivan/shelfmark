import type { ChangelogFeature } from '../models/changelog-feature.interface';
import type { ChangelogHighlight } from '../models/changelog-highlight.interface';
import { CHANGELOG_ITEM_KIND } from '../models/changelog-item-kind.const';
import type { ChangelogItem } from '../models/changelog-item.type';
import type { ChangelogRelease } from '../models/changelog-release.interface';
import { compareVersions } from './compare-versions';

/** The releases that shipped (a dated entry), newest first; the draft of the next one is left out. */
export function releasedChangelog(
  releases: readonly ChangelogRelease[],
): readonly (ChangelogRelease & { readonly date: string })[] {
  return releases
    .filter((release): release is ChangelogRelease & { date: string } => release.date !== null)
    .toSorted((a, b) => compareVersions(b.version, a.version));
}

/**
 * The highlighted features of the releases newer than `after` (all releases for `null`), newest release
 * first, at most `max`.
 */
export function changelogHighlights(
  releases: readonly ChangelogRelease[],
  after: string | null,
  max: number,
): ChangelogHighlight[] {
  return releasedChangelog(releases)
    .filter((release) => after === null || compareVersions(release.version, after) > 0)
    .flatMap((release) =>
      release.items
        .filter(isHighlight)
        .map((item) => ({ item, version: release.version, date: release.date })),
    )
    .slice(0, max);
}

/** A feature (a title and a text), not a one-line fix. */
export function isFeature(item: ChangelogItem): item is ChangelogFeature {
  return item.kind === CHANGELOG_ITEM_KIND.Feature;
}

/** A feature marked for "What's new" (fixes never are). */
export function isHighlight(item: ChangelogItem): item is ChangelogFeature {
  return isFeature(item) && item.highlight;
}
