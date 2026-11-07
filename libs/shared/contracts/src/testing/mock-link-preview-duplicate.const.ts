import type { LinkPreviewResponse } from '../links/link-preview-response.interface';
import { MOCK_ID } from './mock-id.const';
import { MOCK_NAME } from './mock-name.const';

/** Preview of an already saved URL, so the duplicate warning can be shown. */
export const MOCK_LINK_PREVIEW_DUPLICATE: LinkPreviewResponse = {
  preview: {
    url: 'https://angular.dev/overview',
    title: 'Angular overview',
    description: 'Learn what Angular is.',
    imageUrl: null,
    faviconUrl: 'https://angular.dev/favicon.ico',
  },
  duplicate: {
    id: MOCK_ID.LinkAngular,
    title: 'Angular overview',
    folderId: MOCK_ID.FolderAngular,
    folderName: MOCK_NAME.FolderAngular,
  },
};
