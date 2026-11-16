import type { ChangelogRelease } from '../models/changelog-release.interface';

/** The releases with the undated draft dated `today` (YYYY-MM-DD), so it shows as released. */
export function previewDraft(
  releases: readonly ChangelogRelease[],
  today: string,
): readonly ChangelogRelease[] {
  return releases.map((release) => (release.date === null ? { ...release, date: today } : release));
}
