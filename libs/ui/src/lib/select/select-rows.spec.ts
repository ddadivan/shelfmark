import { describe, expect, it } from 'vitest';
import type { SelectOption } from './models/select-option.interface';
import { selectedRow, selectRows } from './select-rows';

const tree: SelectOption[] = [
  {
    id: 'work',
    name: 'Work',
    children: [
      { id: 'angular', name: 'Angular', children: [{ id: 'signals', name: 'Signals' }] },
      { id: 'courses', name: 'Courses' },
    ],
  },
  { id: 'clothes', name: 'Clothes' },
];

describe('selectRows', () => {
  it('flattens the tree in order with the depth and the path', () => {
    const rows = selectRows(tree, '', '');
    expect(rows.map((r) => [r.id, r.level])).toEqual([
      ['work', 0],
      ['angular', 1],
      ['signals', 2],
      ['courses', 1],
      ['clothes', 0],
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
      'work',
      'angular',
      'signals',
    ]);
    expect(selectRows(tree, 'cl', '').map((r) => r.id)).toEqual(['clothes']);
  });

  it('shows the empty row only when it matches the query', () => {
    expect(selectRows(tree, 'uns', 'Unsorted').map((r) => r.id)).toEqual([null]);
    expect(selectRows(tree, 'zzz', 'Unsorted')).toEqual([]);
  });

  it('finds the selected row in the whole tree', () => {
    expect(selectedRow(tree, 'angular', '')?.path).toBe('Work / Angular');
    expect(selectedRow(tree, null, 'Unsorted')?.name).toBe('Unsorted');
    expect(selectedRow(tree, null, '')).toBeUndefined();
    expect(selectedRow(tree, 'gone', '')).toBeUndefined();
  });
});
