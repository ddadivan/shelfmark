import { FOLDER_DEFAULT_COLOUR } from '../folders/folder-default-colour.const';
import { FOLDER_DEFAULT_ICON } from '../folders/folder-default-icon.const';
import type { FolderResponse } from '../folders/folder-response.interface';
import { MOCK_ID } from './mock-id.const';
import { MOCK_NAME } from './mock-name.const';
import { MOCK_TIMESTAMP } from './mock-timestamp.const';

export const MOCK_FOLDERS: ReadonlyArray<Readonly<FolderResponse>> = [
  {
    id: MOCK_ID.FolderReading,
    parentId: null,
    name: MOCK_NAME.FolderReading,
    colour: FOLDER_DEFAULT_COLOUR,
    icon: FOLDER_DEFAULT_ICON,
    position: 0,
    pinned: false,
    linkCount: 0,
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: MOCK_ID.FolderAngular,
    parentId: MOCK_ID.FolderReading,
    name: MOCK_NAME.FolderAngular,
    colour: FOLDER_DEFAULT_COLOUR,
    icon: FOLDER_DEFAULT_ICON,
    position: 0,
    pinned: false,
    linkCount: 1,
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
];
