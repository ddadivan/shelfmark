import type { FolderResponse } from './folder-response.interface';

/** `GET /api/folders/:id` response: one folder with its direct link count; a foreign or missing id is a 404. */
export type GetFolderResponse = FolderResponse;
