import type { UiTreeNode } from '../models/tree-node.interface';
import { TREE_STORY_ID } from './tree-story-id.const';
import { TREE_STORY_NAME } from './tree-story-name.const';

/** Story data (#418): coloured folders (a built-in colour, an own one, an emoji) and a description. */
export const TREE_STORY_COLOURED: readonly UiTreeNode[] = [
  {
    id: TREE_STORY_ID.Work,
    name: TREE_STORY_NAME.Work,
    colour: 'ocean',
    icon: 'briefcase',
    count: 34,
    expanded: true,
    children: [
      { id: TREE_STORY_ID.Angular, name: TREE_STORY_NAME.Angular, colour: 'rose', count: 12 },
      { id: TREE_STORY_ID.Courses, name: TREE_STORY_NAME.Courses, count: 8 },
    ],
  },
  {
    id: TREE_STORY_ID.Clothes,
    name: TREE_STORY_NAME.Clothes,
    colour: '#3a7bd5',
    icon: '👕',
    count: 21,
  },
  {
    id: TREE_STORY_ID.Recipes,
    name: TREE_STORY_NAME.Recipes,
    colour: 'amber',
    icon: 'utensils',
    description: 'Dishes worth cooking twice',
    count: 15,
  },
];
