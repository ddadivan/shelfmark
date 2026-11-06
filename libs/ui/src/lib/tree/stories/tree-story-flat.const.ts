import type { UiTreeNode } from '../models/tree-node.interface';

/** Story data: folders without nesting. */
export const TREE_STORY_FLAT: readonly UiTreeNode[] = [
  { id: 'work', name: 'Work', count: 34 },
  { id: 'clothes', name: 'Clothes', count: 21 },
  { id: 'recipes', name: 'Recipes', count: 15 },
  { id: 'travel', name: 'Travel', count: 6 },
];
