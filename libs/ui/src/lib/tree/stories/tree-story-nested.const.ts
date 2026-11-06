import type { UiTreeNode } from '../models/tree-node.interface';
import { TREE_STORY_ID } from './tree-story-id.const';
import { TREE_STORY_NAME } from './tree-story-name.const';

/** Story data: Work is open, Clothes is closed. */
export const TREE_STORY_NESTED: readonly UiTreeNode[] = [
  {
    id: TREE_STORY_ID.Work,
    name: TREE_STORY_NAME.Work,
    count: 34,
    expanded: true,
    children: [
      { id: TREE_STORY_ID.Angular, name: TREE_STORY_NAME.Angular, count: 12 },
      { id: TREE_STORY_ID.Courses, name: TREE_STORY_NAME.Courses, count: 8 },
    ],
  },
  {
    id: TREE_STORY_ID.Clothes,
    name: TREE_STORY_NAME.Clothes,
    count: 21,
    children: [
      { id: TREE_STORY_ID.Shoes, name: TREE_STORY_NAME.Shoes, count: 7 },
      { id: 'coats', name: 'Coats', count: 4 },
    ],
  },
  { id: TREE_STORY_ID.Recipes, name: TREE_STORY_NAME.Recipes, count: 15 },
];
