import { describe, expect, it } from 'vitest';
import type { SelectOption } from './models/select-option.interface';
import { selectedRow, selectRows } from './select-rows';
import { SELECT_FIXTURE_ID } from './models/select-fixture-id.const';

const tree: SelectOption[] = [
  {
    id: SELECT_FIXTURE_ID.Work,
    name: 'Work',
    children: [
      {
        id: SELECT_FIXTURE_ID.Angular,
        name: 'Angular',
        children: [{ id: SELECT_FIXTURE_ID.Signals, name: 'Signals' }],
      },
      { id: SELECT_FIXTURE_ID.Courses, name: 'Courses' },
    ],
  },
  { id: SELECT_FIXTURE_ID.Clothes, name: 'Clothes' },
];

describe('selectRows', () => {
  it('keeps the language of a name (a language list)', () => {
    const rows = selectRows(
      [
        { id: 'de', name: 'Deutsch', lang: 'de' },
        { id: 'browser', name: 'Match my browser' },
      ],
      '',
      '',
    );
    expect(rows[0]?.lang).toBe('de');
    expect(rows[1]).not.toHaveProperty('lang');
  });

  it('flattens the tree in order with the depth and the path', () => {
    const rows = selectRows(tree, '', '');
    expect(rows.map((r) => [r.id, r.level])).toEqual([
      [SELECT_FIXTURE_ID.Work, 0],
      [SELECT_FIXTURE_ID.Angular, 1],
      [SELECT_FIXTURE_ID.Signals, 2],
      [SELECT_FIXTURE_ID.Courses, 1],
      [SELECT_FIXTURE_ID.Clothes, 0],
    ]);
    expect(rows[2]?.path).toBe('Work / Angular / Signals');
  });

  it('puts the empty row first when it has a label', () => {
    const rows = selectRows(tree, '', 'Unsorted');
    expect(rows[0]).toEqual({ id: null, name: 'Unsorted', path: 'Unsorted', level: 0 });
    expect(rows).toHaveLength(6);
  });

  it('keeps matches with their ancestors, ignoring case and spaces around', () => {
    expect(selectRows(tree, '  SIGN ', '').map((r) => r.id)).toEqual([
      SELECT_FIXTURE_ID.Work,
      SELECT_FIXTURE_ID.Angular,
      SELECT_FIXTURE_ID.Signals,
    ]);
    expect(selectRows(tree, 'cl', '').map((r) => r.id)).toEqual([SELECT_FIXTURE_ID.Clothes]);
  });

  it('shows the empty row only when it matches the query', () => {
    expect(selectRows(tree, 'uns', 'Unsorted').map((r) => r.id)).toEqual([null]);
    expect(selectRows(tree, 'zzz', 'Unsorted')).toEqual([]);
  });

  it('finds the selected row in the whole tree', () => {
    expect(selectedRow(tree, SELECT_FIXTURE_ID.Angular, '')?.path).toBe('Work / Angular');
    expect(selectedRow(tree, null, 'Unsorted')?.name).toBe('Unsorted');
    expect(selectedRow(tree, null, '')).toBeUndefined();
    expect(selectedRow(tree, 'gone', '')).toBeUndefined();
  });
});
