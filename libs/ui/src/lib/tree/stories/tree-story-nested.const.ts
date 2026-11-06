import type { UiTreeNode } from '../models/tree-node.interface';

/** Story data: Work is open, Clothes is closed. */
export const TREE_STORY_NESTED: readonly UiTreeNode[] = [
  {
    id: 'work',
    name: 'Work',
    count: 34,
    expanded: true,
    children: [
      { id: 'angular', name: 'Angular', count: 12 },
      { id: 'courses', name: 'Courses', count: 8 },
    ],
  },
  {
    id: 'clothes',
    name: 'Clothes',
    count: 21,
    children: [
      { id: 'shoes', name: 'Shoes', count: 7 },
      { id: 'coats', name: 'Coats', count: 4 },
    ],
  },
  { id: 'recipes', name: 'Recipes', count: 15 },
];
