import { cleanupReport } from '../../../../testing/cleanup-report';
import { applyCount, applyRequest, duplicateRows, tagRows } from './cleanup-rows';

describe('cleanup rows', () => {
  const report = cleanupReport();
  const none = new Set<string>();

  it('builds one row per group with its copies, place, distinct hosts and AI mark', () => {
    const rows = duplicateRows(report, new Set(['g2']), (id) => `folder ${id}`);
    expect(rows.map((row) => [row.id, row.copies, row.ai, row.selected])).toEqual([
      ['g1', 2, false, true],
      ['g2', 1, true, false],
    ]);
    expect(rows[0]?.place).toBeNull();
    expect(rows[0]?.hosts).toEqual(['news.ycombinator.com']);
    expect(rows[1]?.hosts).toEqual(['angular.dev', 'next.angular.dev']);
    expect(duplicateRows(null, none, () => null)).toEqual([]);
  });

  it('turns swapped pairs round and counts copies plus merges', () => {
    const tags = tagRows(report, none, new Set(['p1']));
    expect([tags[0]?.keep.name, tags[0]?.merge.name]).toEqual(['js', 'javascript']);
    expect(
      applyCount(
        duplicateRows(report, none, () => null),
        tags,
      ),
    ).toBe(4);
    expect(applyCount([], tagRows(report, new Set(['p1']), none))).toBe(0);
  });

  it('sends every copy of the selected groups and the chosen keep of the selected pairs', () => {
    expect(applyRequest(report, new Set(['g1']), new Set(['p1']))).toEqual({
      duplicates: [{ groupId: 'g2', trashIds: ['ng2'] }],
      tagMerges: [{ pairId: 'p1', keepTagId: 't-js' }],
    });
    expect(applyRequest(null, none, none)).toEqual({ duplicates: [], tagMerges: [] });
  });
});
