import type { UiTreeNode } from '../models/tree-node.interface';

/** Story data: names far wider than the sidebar, with large counts. */
export const TREE_STORY_LONG: readonly UiTreeNode[] = [
  {
    id: 'research',
    name: 'Research papers and long reads that I want to come back to over the winter',
    count: 1204,
    expanded: true,
    children: [
      {
        id: 'ml',
        name: 'Machine learning for recommendation systems at scale in production',
        count: 318,
      },
      { id: 'short', name: 'Short', count: 2 },
    ],
  },
  { id: 'unbroken', name: 'Averyveryveryverylongfoldernamewithoutanyspacesatall', count: 3 },
];
