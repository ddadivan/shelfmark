import en from '../../../core/i18n/en.json';
import { APP_VERSION } from '../../../models/app-version.const';
import { compareVersions } from '../utils/compare-versions';
import { isHighlight, releasedChangelog } from '../utils/changelog-highlights';
import { CHANGELOG_ITEM_KIND } from './changelog-item-kind.const';
import { CHANGELOG } from './changelog.const';

/** Reads a dotted key of the English file; `undefined` when it is missing. */
function english(key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        typeof node === 'object' && node !== null ? Reflect.get(node, part) : undefined,
      en,
    );
}

describe('CHANGELOG', () => {
  it('lists unique SemVer releases, newest first, with ISO dates', () => {
    const versions = CHANGELOG.map((release) => release.version);

    expect(new Set(versions).size).toBe(versions.length);
    for (const release of CHANGELOG) {
      expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
      if (release.date !== null) {
        expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
    expect(versions).toEqual(versions.toSorted((a, b) => compareVersions(b, a)));
  });

  it('keeps at most one undated draft, at the top', () => {
    const drafts = CHANGELOG.filter((release) => release.date === null);

    expect(drafts.length).toBeLessThanOrEqual(1);
    if (drafts[0]) {
      expect(CHANGELOG[0]).toBe(drafts[0]);
    }
  });

  it('has English texts for every item (a title for features), with unique ids', () => {
    const items = CHANGELOG.flatMap((release) => release.items);

    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    for (const item of items) {
      expect(typeof english(item.textKey), item.textKey).toBe('string');
      if (item.kind === CHANGELOG_ITEM_KIND.Feature) {
        expect(typeof english(item.titleKey), item.titleKey).toBe('string');
      }
    }
  });

  it('gives every minor release a highlight and keeps patch releases to one-line fixes', () => {
    for (const release of CHANGELOG) {
      expect(release.items.length).toBeGreaterThan(0);
      if (release.version.endsWith('.0')) {
        expect(release.items.some(isHighlight)).toBe(true);
      } else {
        expect(release.items.every((item) => item.kind === CHANGELOG_ITEM_KIND.Fix)).toBe(true);
      }
    }
  });

  it('keeps media same-origin under /media/whats-new/, one loop per release at most', () => {
    for (const release of CHANGELOG) {
      const features = release.items.filter((item) => item.kind === CHANGELOG_ITEM_KIND.Feature);
      expect(features.filter((item) => item.video).length).toBeLessThanOrEqual(1);
      for (const item of features) {
        for (const src of [item.image?.src, item.video?.src, item.video?.poster]) {
          if (src !== undefined) {
            expect(src).toMatch(/^\/media\/whats-new\/[\w.-]+$/);
          }
        }
      }
    }
  });

  it('matches the app version: the latest release on main, an older one on stage (-dev)', () => {
    const latest = releasedChangelog(CHANGELOG)[0]?.version ?? '0.0.0';

    if (APP_VERSION.includes('-')) {
      expect(compareVersions(latest, APP_VERSION)).toBeLessThan(0);
    } else {
      expect(latest).toBe(APP_VERSION);
    }
  });
});
