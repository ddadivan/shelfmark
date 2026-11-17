import type { ChangelogFeature } from '../models/changelog-feature.interface';
import type { ChangelogImprovement } from '../models/changelog-improvement.interface';
import type { ChangelogFix } from '../models/changelog-fix.interface';
import { CHANGELOG_ITEM_KIND } from '../models/changelog-item-kind.const';
import type { ChangelogRelease } from '../models/changelog-release.interface';
import {
  changelogHighlights,
  changelogMoreCount,
  changelogSections,
  isHighlight,
  releasedChangelog,
} from './changelog-highlights';

const item = (id: string, priority?: number): ChangelogFeature => ({
  kind: CHANGELOG_ITEM_KIND.Feature,
  id,
  titleKey: `t.${id}`,
  textKey: `x.${id}`,
  ...(priority === undefined ? {} : { priority }),
});
const improvement = (id: string): ChangelogImprovement => ({
  kind: CHANGELOG_ITEM_KIND.Improvement,
  id,
  textKey: `x.${id}`,
});
const fix = (id: string): ChangelogFix => ({
  kind: CHANGELOG_ITEM_KIND.Fix,
  id,
  textKey: `x.${id}`,
});

const RELEASES: readonly ChangelogRelease[] = [
  { version: '2.1.0', date: null, items: [item('draft', 1)] },
  { version: '2.0.1', date: '2026-11-14', items: [fix('fix'), item('uk', 1)] },
  { version: '2.0.10', date: '2026-11-20', items: [item('late', 1)] },
  {
    version: '2.0.0',
    date: '2026-11-13',
    items: [item('c'), item('b', 2), improvement('imp'), item('a', 1)],
  },
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
  it('is true only for a feature with a priority', () => {
    expect(isHighlight(item('a', 1))).toBe(true);
    expect(isHighlight(item('b'))).toBe(false);
    expect(isHighlight(improvement('i'))).toBe(false);
    expect(isHighlight(fix('c'))).toBe(false);
  });
});

describe('changelogHighlights', () => {
  it('lists the prioritised features, newest release first and by priority inside a release', () => {
    expect(changelogHighlights(RELEASES, null, 10).map((h) => h.item.id)).toEqual([
      'late',
      'uk',
      'a',
      'b',
    ]);
  });

  it('keeps only the releases newer than the last seen one, with their version and date', () => {
    expect(changelogHighlights(RELEASES, '2.0.1', 10)).toEqual([
      { item: item('late', 1), version: '2.0.10', date: '2026-11-20' },
    ]);
    expect(changelogHighlights(RELEASES, '2.0.10', 10)).toEqual([]);
  });

  it('stops at the maximum', () => {
    expect(changelogHighlights(RELEASES, null, 2).map((h) => h.item.id)).toEqual(['late', 'uk']);
  });
});

describe('changelogMoreCount', () => {
  it('counts every other item of the unseen releases, features, improvements and fixes', () => {
    // 2.0.10: 1, 2.0.1: 2, 2.0.0: 4 items; four highlights are shown.
    expect(changelogMoreCount(RELEASES, null, 4)).toBe(3);
    expect(changelogMoreCount(RELEASES, '2.0.1', 1)).toBe(0);
    expect(changelogMoreCount(RELEASES, '2.0.0', 1)).toBe(2);
  });

  it('is 0 when nothing is left out and never negative', () => {
    expect(changelogMoreCount(RELEASES, '2.0.10', 0)).toBe(0);
    expect(changelogMoreCount(RELEASES, '2.0.1', 5)).toBe(0);
  });
});

describe('changelogSections', () => {
  it('groups a release into features, improvements and fixes, leaving empty groups empty', () => {
    const sections = changelogSections({
      version: '2.1.0',
      date: null,
      items: [fix('f1'), improvement('i1'), item('n1', 1), improvement('i2')],
    });

    expect(sections.features.map((entry) => entry.id)).toEqual(['n1']);
    expect(sections.improvements.map((entry) => entry.id)).toEqual(['i1', 'i2']);
    expect(sections.fixes.map((entry) => entry.id)).toEqual(['f1']);
    expect(changelogSections({ version: '2.0.1', date: null, items: [fix('only')] })).toMatchObject(
      { features: [], improvements: [] },
    );
  });
});
