import { dataNodes, extensionNodes, fixedNodes, trashNodes } from './sidebar-nodes';
import type { SidebarLabels } from '../models/sidebar-labels.interface';

const LABELS: SidebarLabels = {
  all: 'All links',
  unsorted: 'Unsorted',
  favorites: 'Favorites',
  actions: 'Actions for {name}',
  recent: 'Recently opened',
  today: 'Today',
  trash: 'Trash',
  data: 'Data & help',
  extension: 'Get the extension',
  whatsNewDot: 'new',
};

describe('sidebar nodes', () => {
  it('builds the fixed rows with counts', () => {
    const nodes = fixedNodes(LABELS, { all: 5, unsorted: 2, favorites: 1 });
    expect(nodes.map((node) => [node.id, node.name, node.count])).toEqual([
      ['all', 'All links', 5],
      ['unsorted', 'Unsorted', 2],
      ['favorites', 'Favorites', 1],
      ['today', 'Today', undefined],
      ['recent', 'Recently opened', undefined],
    ]);
  });

  it('counts the due reminders on the Today row, even without link counts', () => {
    const today = fixedNodes(LABELS, null, 2).find((node) => node.id === 'today');
    expect(today).toMatchObject({ name: 'Today', icon: 'history', count: 2 });
  });

  it('puts the forgotten note on the Recently opened row only while there is one', () => {
    const recent = (note?: string) =>
      fixedNodes(LABELS, null, undefined, note).find((node) => node.id === 'recent');
    expect(recent('5 forgotten')).toMatchObject({ note: '5 forgotten' });
    expect(recent()).not.toHaveProperty('note');
  });

  it('leaves the counts out without counts', () => {
    expect(fixedNodes(LABELS, null).every((node) => !('count' in node))).toBe(true);
  });

  it('builds the one "Data & help" row, with the dot while a release is unseen', () => {
    expect(dataNodes(LABELS)).toEqual([{ id: 'data', name: 'Data & help', icon: 'more' }]);
    expect(dataNodes(LABELS, true)).toEqual([
      { id: 'data', name: 'Data & help', icon: 'more', dot: 'new' },
    ]);
  });

  it('adds "Get the extension" once the banner was closed (#455)', () => {
    expect(extensionNodes(LABELS)).toEqual([]);
    expect(extensionNodes(LABELS, true)).toEqual([
      { id: 'extension', name: 'Get the extension', icon: 'download' },
    ]);
  });

  it('builds the trash row with or without a count', () => {
    expect(trashNodes(LABELS, 3)[0]).toMatchObject({ id: 'trash', count: 3 });
    expect('count' in (trashNodes(LABELS, undefined)[0] ?? {})).toBe(false);
  });
});
