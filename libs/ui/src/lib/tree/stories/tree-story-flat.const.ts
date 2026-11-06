import type { UiTreeNode } from '../models/tree-node.interface';
import { TREE_STORY_ID } from './tree-story-id.const';
import { TREE_STORY_NAME } from './tree-story-name.const';

/** Story data: folders without nesting. */
export const TREE_STORY_FLAT: readonly UiTreeNode[] = [
  { id: TREE_STORY_ID.Work, name: TREE_STORY_NAME.Work, count: 34 },
  { id: TREE_STORY_ID.Clothes, name: TREE_STORY_NAME.Clothes, count: 21 },
  { id: TREE_STORY_ID.Recipes, name: TREE_STORY_NAME.Recipes, count: 15 },
  { id: 'travel', name: 'Travel', count: 6 },
];
