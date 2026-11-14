import { weekBars } from './week-bars';

describe('weekBars', () => {
  it('scales every week to the tallest one', () => {
    expect(
      weekBars([
        { weekStart: '2026-11-02', count: 1 },
        { weekStart: '2026-11-09', count: 4 },
        { weekStart: '2026-10-26', count: 0 },
      ]).map((bar) => bar.percent),
    ).toEqual([25, 100, 0]);
  });

  it('keeps empty weeks flat when nothing was added', () => {
    expect(weekBars([{ weekStart: '2026-11-09', count: 0 }])).toEqual([
      { weekStart: '2026-11-09', count: 0, percent: 0 },
    ]);
  });
});
