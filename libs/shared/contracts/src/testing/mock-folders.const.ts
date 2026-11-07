import type { FolderResponse } from '../folders/folder-response.interface';
import { MOCK_ID } from './mock-id.const';
import { MOCK_TIMESTAMP } from './mock-timestamp.const';

export const MOCK_FOLDERS: FolderResponse[] = [
  {
    id: MOCK_ID.FolderReading,
    parentId: null,
    name: 'Reading',
    linkCount: 0,
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: MOCK_ID.FolderAngular,
    parentId: MOCK_ID.FolderReading,
    name: 'Angular',
    linkCount: 1,
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
];
