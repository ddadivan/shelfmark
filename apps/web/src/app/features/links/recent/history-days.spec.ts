import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { groupByDay } from './history-days';
import { HISTORY_DAY_KIND } from './models/history-day-kind.const';

const NOW = new Date(2026, 10, 10, 15, 0);

function opened(id: string, at: Date | null): LinkResponse {
  return { ...MOCK_LINKS[0], id, lastOpenedAt: at === null ? null : at.toISOString() };
}

describe('groupByDay', () => {
  it('groups by local day: today, yesterday, one week group, then each older day', () => {
    const days = groupByDay(
      [
        opened('a', new Date(2026, 10, 10, 14, 0)),
        opened('b', new Date(2026, 10, 10, 9, 0)),
        opened('c', new Date(2026, 10, 9, 23, 30)),
        opened('d', new Date(2026, 10, 7, 12, 0)),
        opened('e', new Date(2026, 10, 5, 12, 0)),
        opened('f', new Date(2026, 10, 3, 12, 0)),
        opened('g', new Date(2026, 10, 3, 8, 0)),
        opened('h', new Date(2026, 9, 20, 8, 0)),
      ],
      NOW,
    );

    expect(days.map((day) => [day.kind, day.links.map((link) => link.id)])).toEqual([
      [HISTORY_DAY_KIND.Today, ['a', 'b']],
      [HISTORY_DAY_KIND.Yesterday, ['c']],
      [HISTORY_DAY_KIND.Week, ['d', 'e']],
      [HISTORY_DAY_KIND.Date, ['f', 'g']],
      [HISTORY_DAY_KIND.Date, ['h']],
    ]);
    expect(days[3].key).toBe('2026-11-03');
  });

  it('uses the local midnight, not 24 hours, for "yesterday"', () => {
    const days = groupByDay(
      [opened('a', new Date(2026, 10, 9, 0, 5))],
      new Date(2026, 10, 10, 0, 10),
    );
    expect(days[0].kind).toBe(HISTORY_DAY_KIND.Yesterday);
  });

  it('skips links that were never opened and treats the future as today', () => {
    const days = groupByDay([opened('a', null), opened('b', new Date(2026, 10, 11, 1, 0))], NOW);
    expect(days.map((day) => day.kind)).toEqual([HISTORY_DAY_KIND.Today]);
  });

  it('is empty for no links', () => {
    expect(groupByDay([], NOW)).toEqual([]);
  });
});
