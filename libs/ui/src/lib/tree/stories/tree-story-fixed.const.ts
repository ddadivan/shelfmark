import type { UiTreeNode } from '../models/tree-node.interface';

/** Story data: the fixed entries before the folders. */
export const TREE_STORY_FIXED: readonly UiTreeNode[] = [
  { id: 'all', name: 'All links', icon: 'link', count: 248 },
  { id: 'unsorted', name: 'Unsorted', icon: 'inbox', count: 17 },
  { id: 'favorites', name: 'Favorites', icon: 'star', count: 9 },
];
