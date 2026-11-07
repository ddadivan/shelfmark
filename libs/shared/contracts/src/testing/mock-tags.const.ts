import type { TagResponse } from '../tags/tag-response.interface';
import { MOCK_ID } from './mock-id.const';
import { MOCK_NAME } from './mock-name.const';
import { MOCK_TIMESTAMP } from './mock-timestamp.const';

export const MOCK_TAGS: ReadonlyArray<Readonly<TagResponse>> = [
  {
    id: MOCK_ID.TagDocs,
    name: MOCK_NAME.TagDocs,
    linkCount: 1,
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: MOCK_ID.TagRecipes,
    name: MOCK_NAME.TagRecipes,
    linkCount: 1,
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
];
