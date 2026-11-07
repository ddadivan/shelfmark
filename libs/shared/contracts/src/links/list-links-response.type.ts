import type { CursorPage } from '../pagination/cursor-page.interface';
import type { LinkResponse } from './link-response.interface';

/** `GET /api/links` response. */
export type ListLinksResponse = CursorPage<LinkResponse>;
