import type { UiTreeNode } from '../models/tree-node.interface';
import { TREE_STORY_ID } from './tree-story-id.const';
import { TREE_STORY_NAME } from './tree-story-name.const';

/** Story data: five levels, all open. */
export const TREE_STORY_DEEP: readonly UiTreeNode[] = [
  {
    id: TREE_STORY_ID.Work,
    name: TREE_STORY_NAME.Work,
    count: 120,
    expanded: true,
    children: [
      {
        id: 'frontend',
        name: 'Frontend',
        count: 80,
        expanded: true,
        children: [
          {
            id: TREE_STORY_ID.Angular,
            name: TREE_STORY_NAME.Angular,
            count: 40,
            expanded: true,
            children: [
              {
                id: 'signals',
                name: 'Signals',
                count: 12,
                expanded: true,
                children: [{ id: TREE_STORY_ID.Forms, name: 'Signal Forms', count: 5 }],
              },
              { id: 'aria', name: 'Aria', count: 6 },
            ],
          },
          { id: 'css', name: 'CSS', count: 22 },
        ],
      },
      { id: 'backend', name: 'Backend', count: 30 },
    ],
  },
];
