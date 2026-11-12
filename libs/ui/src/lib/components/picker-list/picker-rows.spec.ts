import { describe, expect, it } from 'vitest';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import type { PickerOption } from './models/picker-option.interface';
import { pickerRows } from './picker-rows';

const TREE: PickerOption[] = [
  {
    id: 'work',
    name: 'Work',
    colour: FOLDER_COLOUR.Sage,
    icon: 'star',
    children: [{ id: 'angular', name: 'Angular' }],
  },
  { id: 'clothes', name: 'Clothes' },
];

describe('pickerRows', () => {
  it('puts the empty row first, then the tree in order with levels, icons and colours', () => {
    const rows = pickerRows(TREE, '', 'Unsorted', []);
    expect(rows.map((row) => [row.id, row.level, row.icon, row.colour])).toEqual([
      [null, 0, 'inbox', FOLDER_COLOUR.Graphite],
      ['work', 0, 'star', FOLDER_COLOUR.Sage],
      ['angular', 1, 'folder', FOLDER_COLOUR.Graphite],
      ['clothes', 0, 'folder', FOLDER_COLOUR.Graphite],
    ]);
    expect(rows[2]?.path).toBe('Work / Angular');
  });

  it('has no empty row without a label', () => {
    expect(pickerRows(TREE, '', '', []).map((row) => row.id)).toEqual([
      'work',
      'angular',
      'clothes',
    ]);
  });

  it('keeps matches with their ancestors', () => {
    expect(pickerRows(TREE, 'ang', 'Unsorted', []).map((row) => row.id)).toEqual([
      'work',
      'angular',
    ]);
  });

  it('flags the current rows, the empty one included', () => {
    const rows = pickerRows(TREE, '', 'Unsorted', [null, 'clothes']);
    expect(rows.filter((row) => row.current).map((row) => row.id)).toEqual([null, 'clothes']);
  });
});
