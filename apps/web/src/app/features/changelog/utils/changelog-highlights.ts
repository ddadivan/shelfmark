import type { ChangelogFeature } from '../models/changelog-feature.interface';
import type { ChangelogFix } from '../models/changelog-fix.interface';
import type { ChangelogHighlight } from '../models/changelog-highlight.interface';
import type { ChangelogImprovement } from '../models/changelog-improvement.interface';
import { CHANGELOG_ITEM_KIND } from '../models/changelog-item-kind.const';
import type { ChangelogItem } from '../models/changelog-item.type';
import type { ChangelogRelease } from '../models/changelog-release.interface';
import type { ChangelogSections } from '../models/changelog-sections.interface';
import { compareVersions } from './compare-versions';

/** The releases that shipped (a dated entry), newest first; the draft of the next one is left out. */
export function releasedChangelog(
  releases: readonly ChangelogRelease[],
): readonly (ChangelogRelease & { readonly date: string })[] {
  return releases
    .filter((release): release is ChangelogRelease & { date: string } => release.date !== null)
    .toSorted((a, b) => compareVersions(b.version, a.version));
}

/** The shipped releases newer than `after` (all of them for `null`), newest first. */
function releasesAfter(releases: readonly ChangelogRelease[], after: string | null) {
  return releasedChangelog(releases).filter(
    (release) => after === null || compareVersions(release.version, after) > 0,
  );
}

/**
 * The highlighted features of the releases newer than `after` (all releases for `null`): the newest
 * release first, inside a release by `priority` (1 first), at most `max`.
 */
export function changelogHighlights(
  releases: readonly ChangelogRelease[],
  after: string | null,
  max: number,
): ChangelogHighlight[] {
  return releasesAfter(releases, after)
    .flatMap((release) =>
      release.items
        .filter(isHighlight)
        .toSorted((a, b) => a.priority - b.priority)
        .map((item) => ({ item, version: release.version, date: release.date })),
    )
    .slice(0, max);
}

/**
 * How many changes of the releases newer than `after` the card leaves out: every item of those
 * releases (features, improvements and fixes) minus the `shown` highlights.
 */
export function changelogMoreCount(
  releases: readonly ChangelogRelease[],
  after: string | null,
  shown: number,
): number {
  const total = releasesAfter(releases, after).reduce(
    (sum, release) => sum + release.items.length,
    0,
  );
  return Math.max(0, total - shown);
}

/** The items of a release grouped by kind, each group in the order of the data. */
export function changelogSections(release: ChangelogRelease): ChangelogSections {
  return {
    features: release.items.filter(isFeature),
    improvements: release.items.filter(
      (item): item is ChangelogImprovement => item.kind === CHANGELOG_ITEM_KIND.Improvement,
    ),
    fixes: release.items.filter(
      (item): item is ChangelogFix => item.kind === CHANGELOG_ITEM_KIND.Fix,
    ),
  };
}

/** A feature (a title and a text), not a one-line improvement or fix. */
export function isFeature(item: ChangelogItem): item is ChangelogFeature {
  return item.kind === CHANGELOG_ITEM_KIND.Feature;
}

/** A feature with a `priority`, so it belongs in "What's new" (improvements and fixes never do). */
export function isHighlight(
  item: ChangelogItem,
): item is ChangelogFeature & { readonly priority: number } {
  return isFeature(item) && item.priority !== undefined;
}
