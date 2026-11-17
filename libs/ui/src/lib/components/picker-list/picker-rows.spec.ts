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

  it('puts the recent rows first as flat copies, in the given order, without a query', () => {
    const rows = pickerRows(
      TREE,
      '',
      'Unsorted',
      [],
      ['clothes', null, 'angular', 'gone', 'clothes'],
    );
    expect(rows.slice(0, 3).map((row) => [row.id, row.level, row.recent])).toEqual([
      ['clothes', 0, true],
      [null, 0, true],
      ['angular', 0, true],
    ]);
    expect(rows[2]?.path).toBe('Work / Angular');
    expect(rows.filter((row) => !row.recent).map((row) => row.id)).toEqual([
      null,
      'work',
      'angular',
      'clothes',
    ]);
  });

  it('shows no recent rows while a query filters the list', () => {
    const rows = pickerRows(TREE, 'clo', 'Unsorted', [], ['clothes']);
    expect(rows.map((row) => [row.id, row.recent])).toEqual([['clothes', false]]);
  });
});
