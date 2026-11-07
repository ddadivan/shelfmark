import type { ListFoldersResponse } from '../folders/list-folders-response.interface';
import { MOCK_FOLDERS } from './mock-folders.const';
import { MOCK_LIBRARY_COUNTS } from './mock-library-counts.const';

/** `GET /api/folders` response: `MOCK_FOLDERS` with `MOCK_LIBRARY_COUNTS`. */
export const MOCK_LIST_FOLDERS_RESPONSE: Readonly<ListFoldersResponse> = {
  items: [...MOCK_FOLDERS],
  counts: { ...MOCK_LIBRARY_COUNTS },
};
