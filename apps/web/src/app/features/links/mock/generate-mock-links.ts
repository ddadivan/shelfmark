import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_ID, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { MOCK_LINKS_COUNT } from '../models/mock-links-count.const';

const HOURS_MS = 3_600_000;
const SITE_COUNT = 7;
const BASE_TIME = Date.UTC(2026, 10, 1);
const TAGS = ['docs', 'recipes', 'reading', 'video'] as const;

/**
 * The mock feed: the two contract fixtures first, then generated links, newest first. Every
 * third link is unsorted, every fifth a favorite, every fourth was opened.
 */
export function generateMockLinks(): LinkResponse[] {
  const links: LinkResponse[] = MOCK_LINKS.map((link) => ({ ...link, tags: [...link.tags] }));
  for (let i = links.length; i < MOCK_LINKS_COUNT; i++) {
    const created = new Date(BASE_TIME - i * HOURS_MS).toISOString();
    links.push({
      id: `00000000-0000-4000-8000-${String(1000 + i).padStart(12, '0')}`,
      folderId: i % 3 === 0 ? null : MOCK_ID.FolderReading,
      url: `https://site${i % SITE_COUNT}.example.com/articles/${i}`,
      title: `Saved article ${i}`,
      note: i % 6 === 0 ? `Note for article ${i}` : null,
      faviconUrl: null,
      imageUrl: null,
      isFavorite: i % 5 === 0,
      lastOpenedAt: i % 4 === 0 ? new Date(BASE_TIME - i * 60_000).toISOString() : null,
      tags: [TAGS[i % TAGS.length]],
      createdAt: created,
      updatedAt: created,
    });
  }
  return links;
}
