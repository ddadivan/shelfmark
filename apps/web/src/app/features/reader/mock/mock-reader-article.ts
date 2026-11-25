import {
  LINK_KIND,
  type LinkKind,
  type LinkResponse,
  type ReaderArticle,
} from '@shelfmark/contracts';
import { MOCK_READER_ANGULAR_ARTICLE } from './mock-reader-angular-article.const';
import { MOCK_READER_MDN_ARTICLE } from './mock-reader-mdn-article.const';
import { MOCK_READER_WEBDEV_ARTICLE } from './mock-reader-webdev-article.const';

/** Kinds whose mock page has article text; the others answer "no article". */
const READABLE_KINDS: ReadonlySet<LinkKind> = new Set<LinkKind>([
  LINK_KIND.Article,
  LINK_KIND.Document,
  LINK_KIND.Post,
  LINK_KIND.Recipe,
]);

const SAMPLES: readonly ReaderArticle[] = [
  MOCK_READER_ANGULAR_ARTICLE,
  MOCK_READER_MDN_ARTICLE,
  MOCK_READER_WEBDEV_ARTICLE,
];

/** A stable pick per link, so the same link always shows the same sample. */
function sampleIndex(id: string): number {
  let hash = 5381;
  for (const char of id) {
    hash = (hash * 33 + (char.codePointAt(0) ?? 0)) % 1_000_003;
  }
  return hash % SAMPLES.length;
}

/**
 * MOCK (Shelf): the article text the mock Reader shows for a link of the mock library: the opening
 * of one of three real pages (angular.dev, MDN, web.dev), parsed by the API's extractor, so dev shows real
 * headings, inline code, links, notes, tables and code blocks. Every readable link gets one of them
 * (the app labels it as sample text: `preview.reader.sampleNote`). `null` for kinds without text
 * (video, shop, app).
 */
export function mockReaderArticle(link: LinkResponse): ReaderArticle | null {
  if (!READABLE_KINDS.has(link.kind)) {
    return null;
  }
  return SAMPLES[sampleIndex(link.id)] ?? null;
}
