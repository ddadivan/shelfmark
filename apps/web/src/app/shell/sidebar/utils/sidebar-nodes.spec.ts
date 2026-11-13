import { feedbackNodes, fixedNodes, trashNodes } from './sidebar-nodes';
import type { SidebarLabels } from '../models/sidebar-labels.interface';

const LABELS: SidebarLabels = {
  all: 'All links',
  unsorted: 'Unsorted',
  favorites: 'Favorites',
  actions: 'Actions for {name}',
  recent: 'Recently opened',
  trash: 'Trash',
  feedback: 'Send feedback',
};

describe('sidebar nodes', () => {
  it('builds the fixed rows with counts', () => {
    const nodes = fixedNodes(LABELS, { all: 5, unsorted: 2, favorites: 1 });
    expect(nodes.map((node) => [node.id, node.name, node.count])).toEqual([
      ['all', 'All links', 5],
      ['unsorted', 'Unsorted', 2],
      ['favorites', 'Favorites', 1],
      ['recent', 'Recently opened', undefined],
    ]);
  });

  it('leaves the counts out without counts', () => {
    expect(fixedNodes(LABELS, null).every((node) => !('count' in node))).toBe(true);
  });

  it('builds the feedback row', () => {
    expect(feedbackNodes(LABELS)).toEqual([
      { id: 'feedback', name: 'Send feedback', icon: 'message' },
    ]);
  });

  it('builds the trash row with or without a count', () => {
    expect(trashNodes(LABELS, 3)[0]).toMatchObject({ id: 'trash', count: 3 });
    expect('count' in (trashNodes(LABELS, undefined)[0] ?? {})).toBe(false);
  });
});
