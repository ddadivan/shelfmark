import type { UiTreeNode } from '../models/tree-node.interface';
import { TREE_STORY_ID } from './tree-story-id.const';
import { TREE_STORY_NAME } from './tree-story-name.const';

/** Story data: the fixed entries before the folders. */
export const TREE_STORY_FIXED: readonly UiTreeNode[] = [
  { id: TREE_STORY_ID.All, name: TREE_STORY_NAME.All, icon: 'link', count: 248 },
  { id: TREE_STORY_ID.Unsorted, name: TREE_STORY_NAME.Unsorted, icon: 'inbox', count: 17 },
  { id: TREE_STORY_ID.Favorites, name: TREE_STORY_NAME.Favorites, icon: 'star', count: 9 },
];
