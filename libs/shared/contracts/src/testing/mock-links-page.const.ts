import type { ListLinksResponse } from '../links/list-links-response.interface';
import { MOCK_LINKS } from './mock-links.const';

export const MOCK_LINKS_PAGE: Readonly<ListLinksResponse> = {
  items: [...MOCK_LINKS],
  nextCursor: null,
  pinned: [],
};
