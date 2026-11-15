import type { ChangelogFeature } from '../models/changelog-feature.interface';
import type { ChangelogFix } from '../models/changelog-fix.interface';
import { CHANGELOG_ITEM_KIND } from '../models/changelog-item-kind.const';
import type { ChangelogRelease } from '../models/changelog-release.interface';
import { changelogHighlights, isHighlight, releasedChangelog } from './changelog-highlights';

const item = (id: string, highlight = true): ChangelogFeature => ({
  kind: CHANGELOG_ITEM_KIND.Feature,
  id,
  titleKey: `t.${id}`,
  textKey: `x.${id}`,
  highlight,
});
const fix = (id: string): ChangelogFix => ({
  kind: CHANGELOG_ITEM_KIND.Fix,
  id,
  textKey: `x.${id}`,
});

const RELEASES: readonly ChangelogRelease[] = [
  { version: '2.1.0', date: null, items: [item('draft')] },
  { version: '2.0.1', date: '2026-11-14', items: [fix('fix'), item('uk')] },
  { version: '2.0.10', date: '2026-11-20', items: [item('late')] },
  { version: '2.0.0', date: '2026-11-13', items: [item('a'), item('b'), item('c', false)] },
];

describe('releasedChangelog', () => {
  it('leaves out the undated draft and sorts newest first', () => {
    expect(releasedChangelog(RELEASES).map((release) => release.version)).toEqual([
      '2.0.10',
      '2.0.1',
      '2.0.0',
    ]);
  });
});

describe('isHighlight', () => {
  it('is true only for a feature marked as a highlight', () => {
    expect(isHighlight(item('a'))).toBe(true);
    expect(isHighlight(item('b', false))).toBe(false);
    expect(isHighlight(fix('c'))).toBe(false);
  });
});

describe('changelogHighlights', () => {
  it('lists the highlighted features of every release when nothing was seen', () => {
    expect(changelogHighlights(RELEASES, null, 10).map((h) => h.item.id)).toEqual([
      'late',
      'uk',
      'a',
      'b',
    ]);
  });

  it('keeps only the releases newer than the last seen one, with their version and date', () => {
    expect(changelogHighlights(RELEASES, '2.0.1', 10)).toEqual([
      { item: item('late'), version: '2.0.10', date: '2026-11-20' },
    ]);
    expect(changelogHighlights(RELEASES, '2.0.10', 10)).toEqual([]);
  });

  it('stops at the maximum', () => {
    expect(changelogHighlights(RELEASES, null, 2).map((h) => h.item.id)).toEqual(['late', 'uk']);
  });
});
