import {
  LINK_KIND,
  linkHost,
  READER_BLOCK_KIND,
  type LinkKind,
  type LinkResponse,
  type ReaderArticle,
  type ReaderBlock,
} from '@shelfmark/contracts';

/** Kinds whose mock page has article text; the others answer "no article". */
const READABLE_KINDS: ReadonlySet<LinkKind> = new Set<LinkKind>([
  LINK_KIND.Article,
  LINK_KIND.Document,
  LINK_KIND.Post,
  LINK_KIND.Recipe,
]);

/** Words per minute of the reading-time estimate. */
const WORDS_PER_MINUTE = 220;

function block(kind: ReaderBlock['kind'], text: string, items: string[] = []): ReaderBlock {
  return { kind, text, items, imageUrl: null };
}

/**
 * MOCK (Shelf): the article text the mock Reader shows for a link of the mock library. There is
 * no extraction in the API yet; the text is generic and names the link, so every readable mock
 * link has an article with each block kind once. `null` for kinds without text (video, shop, app).
 */
export function mockReaderArticle(link: LinkResponse): ReaderArticle | null {
  if (!READABLE_KINDS.has(link.kind)) {
    return null;
  }
  const site = linkHost(link.url) ?? link.url;
  const blocks: ReaderBlock[] = [
    block(
      READER_BLOCK_KIND.Paragraph,
      `${link.title} is the page you saved from ${site}. Reader shows its text on a calm page, in the font and size you pick, without the site's menus and banners.`,
    ),
    block(READER_BLOCK_KIND.Heading, 'What it covers'),
    block(
      READER_BLOCK_KIND.Paragraph,
      'The text keeps its headings, paragraphs, lists, quotes and code. Links inside the text open in a new tab, so your place here stays where it was.',
    ),
    block(READER_BLOCK_KIND.List, '', [
      'Start with the summary at the top when there is one.',
      'Change the text size, font and line width in Reading settings.',
      'Come back later: Revisit keeps the articles you started.',
    ]),
    block(
      READER_BLOCK_KIND.Quote,
      'A good page reads the same tomorrow as it does today; Reader keeps it that way.',
    ),
    block(READER_BLOCK_KIND.Heading, 'Before you go'),
    block(READER_BLOCK_KIND.Code, `open ${link.url}`),
    block(
      READER_BLOCK_KIND.Paragraph,
      'Most pages need only a few minutes. Open the site when you want its pictures, comments or anything Reader leaves out.',
    ),
  ];
  const words = blocks
    .flatMap((part) => [part.text, ...part.items])
    .join(' ')
    .split(/\s+/).length;
  return {
    title: link.title,
    author: `${site.split('.')[0] ?? site} team`,
    publishedAt: link.createdAt,
    minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE) + 4),
    blocks,
  };
}
