import type { UiTreeNode } from '../models/tree-node.interface';

/** Story data: five levels, all open. */
export const TREE_STORY_DEEP: readonly UiTreeNode[] = [
  {
    id: 'work',
    name: 'Work',
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
            id: 'angular',
            name: 'Angular',
            count: 40,
            expanded: true,
            children: [
              {
                id: 'signals',
                name: 'Signals',
                count: 12,
                expanded: true,
                children: [{ id: 'forms', name: 'Signal Forms', count: 5 }],
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
