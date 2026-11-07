import type { ListLinksResponse } from '../links/list-links-response.type';
import { MOCK_LINKS } from './mock-links.const';

export const MOCK_LINKS_PAGE: ListLinksResponse = { items: MOCK_LINKS, nextCursor: null };
