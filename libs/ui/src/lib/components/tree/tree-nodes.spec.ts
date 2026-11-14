import type { UiTreeNode } from './models/tree-node.interface';
import { indexTreeNodes, treeAncestors, treeRowPlaces } from './tree-nodes';

const FIXED: UiTreeNode[] = [{ id: 'all', name: 'All links' }];
const FOLDERS: UiTreeNode[] = [
  {
    id: 'work',
    name: 'Work',
    children: [
      { id: 'angular', name: 'Angular', children: [{ id: 'signals', name: 'Signals' }] },
      { id: 'nest', name: 'Nest' },
    ],
  },
  { id: 'home', name: 'Home' },
];

describe('tree nodes', () => {
  it('indexes every row of every list by id', () => {
    const byId = indexTreeNodes(FIXED, FOLDERS);
    expect([...byId.keys()]).toEqual(['all', 'work', 'angular', 'signals', 'nest', 'home']);
    expect(byId.get('signals')?.name).toBe('Signals');
  });

  it('records the parent and the previous sibling of each row', () => {
    const places = treeRowPlaces(FIXED, FOLDERS);
    expect(places.get('all')).toEqual({ parent: null, previous: null });
    expect(places.get('home')).toEqual({ parent: null, previous: 'work' });
    expect(places.get('nest')).toEqual({ parent: 'work', previous: 'angular' });
    expect(places.get('signals')).toEqual({ parent: 'angular', previous: null });
  });

  it('lists the ancestors nearest first and stops at a cycle or an unknown row', () => {
    const places = treeRowPlaces(FOLDERS);
    expect(treeAncestors('signals', places)).toEqual(['angular', 'work']);
    expect(treeAncestors('home', places)).toEqual([]);
    expect(treeAncestors('missing', places)).toEqual([]);
    const cycle = new Map([
      ['a', { parent: 'b', previous: null }],
      ['b', { parent: 'a', previous: null }],
    ]);
    expect(treeAncestors('a', cycle)).toEqual(['b', 'a']);
  });
});
