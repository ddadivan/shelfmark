import type { TagResponse } from '../tags/tag-response.interface';
import { MOCK_ID } from './mock-id.const';
import { MOCK_TIMESTAMP } from './mock-timestamp.const';

export const MOCK_TAGS: TagResponse[] = [
  {
    id: MOCK_ID.TagDocs,
    name: 'docs',
    linkCount: 1,
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: MOCK_ID.TagRecipes,
    name: 'recipes',
    linkCount: 1,
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
];
