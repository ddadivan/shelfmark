import type { LinkResponse } from '../links/link-response.interface';
import { MOCK_ID } from './mock-id.const';
import { MOCK_TIMESTAMP } from './mock-timestamp.const';

export const MOCK_LINKS: LinkResponse[] = [
  {
    id: MOCK_ID.LinkAngular,
    folderId: MOCK_ID.FolderAngular,
    url: 'https://angular.dev/overview',
    title: 'Angular overview',
    note: 'Start here for signals.',
    faviconUrl: 'https://angular.dev/favicon.ico',
    imageUrl: null,
    isFavorite: true,
    lastOpenedAt: MOCK_TIMESTAMP,
    tags: ['docs'],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: MOCK_ID.LinkPasta,
    folderId: null,
    url: 'https://example.com/recipes/pasta',
    title: 'Simple pasta',
    note: null,
    faviconUrl: null,
    imageUrl: null,
    isFavorite: false,
    lastOpenedAt: null,
    tags: ['recipes'],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
];
