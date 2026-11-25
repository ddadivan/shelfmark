import { readFileSync } from 'node:fs';
import {
  READER_BLOCK_KIND,
  type ReaderArticle,
  type ReaderBlock,
  type ReaderListItem,
} from '@shelfmark/contracts';
import { extractReaderArticle } from './extract-reader-article';

const NOW = Date.parse('2026-11-25T12:00:00Z');

interface RealPage {
  /** File name under `fixtures/real/`. */
  file: string;
  /** Address the page was fetched from (relative links resolve against it). */
  url: string;
  title: string;
  /** The first heading and the start of the first paragraph of the article. */
  firstHeading: string;
  firstParagraph: string;
  /** Chrome strings that are in the page's HTML and must not be in the article. */
  chrome: string[];
  /** Fewest code blocks, with the language of the first one when the page marks it. */
  codeBlocks: number;
  firstCodeLanguage: string | null;
  /** Inline code kept as a span, and a link target that must be in the article. */
  inlineCode: string;
  link: string;
  /** The text of one list item the page has (ingredient, detail), and of one numbered step. */
  listItem?: string;
  orderedStep?: string;
  /** Block kinds the article must have besides these. */
  kinds?: ReaderBlock['kind'][];
}

const PAGES: RealPage[] = [
  {
    file: 'angular',
    url: 'https://angular.dev/guide/signals/resource',
    title: 'Async reactivity with resources',
    firstHeading: 'Resource loaders',
    firstParagraph: 'All signal APIs are synchronous',
    chrome: ['On this page', 'Edit this page', 'Back to the top', 'In-depth Guides'],
    codeBlocks: 6,
    firstCodeLanguage: null,
    inlineCode: 'params',
    link: 'https://angular.dev/api/core/Resource',
    kinds: [READER_BLOCK_KIND.Note, READER_BLOCK_KIND.Table, READER_BLOCK_KIND.Heading],
  },
  {
    file: 'mdn',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch',
    title: 'Using the Fetch API',
    firstHeading: 'Making a request',
    firstParagraph: 'The Fetch API provides a JavaScript interface',
    chrome: ['Skip to main content', 'Skip to search', 'Mozilla careers'],
    codeBlocks: 10,
    firstCodeLanguage: 'js',
    inlineCode: 'fetch()',
    link: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch',
    kinds: [READER_BLOCK_KIND.List],
  },
  {
    file: 'webdev',
    url: 'https://web.dev/articles/lcp',
    title: 'Largest Contentful Paint (LCP)',
    firstHeading: 'What is LCP?',
    firstParagraph: 'Largest Contentful Paint (LCP) is an important',
    chrome: ['Skip to main content', 'Related Content', 'Manage cookies', 'Developer Newsletter'],
    codeBlocks: 2,
    firstCodeLanguage: null,
    inlineCode: 'largest-contentful-paint',
    link: 'https://web.dev/articles/vitals#lifecycle',
    kinds: [READER_BLOCK_KIND.Note],
  },
  {
    file: 'medium-synthetic',
    url: 'https://medium.com/@sample/why-i-stopped-using-a-to-do-app-abc123',
    title: 'Why I stopped using a to-do app',
    firstHeading: 'A quiet year with paper',
    firstParagraph: 'For years I kept my tasks in an app.',
    chrome: ['Open in app', 'Get started', 'Responses (4)', 'More from Sample Writer', 'Follow'],
    codeBlocks: 1,
    firstCodeLanguage: null,
    inlineCode: '[ ]',
    link: 'https://example.com/streaks',
    kinds: [READER_BLOCK_KIND.Quote, READER_BLOCK_KIND.List, READER_BLOCK_KIND.Image],
  },
  {
    file: 'github-synthetic',
    url: 'https://github.com/sample-org/sample-lib',
    title: 'sample-lib',
    firstHeading: 'Install',
    firstParagraph: 'A tiny library for parsing durations',
    chrome: ['Releases', 'Contributors', 'Edit this file', 'Pull requests', 'Sign in'],
    codeBlocks: 2,
    firstCodeLanguage: 'shell',
    inlineCode: 'parse',
    link: 'https://github.com/sample-org/sample-lib/blob/main/docs/api.md',
    kinds: [READER_BLOCK_KIND.Table, READER_BLOCK_KIND.Note],
  },
  {
    file: 'wikibooks',
    url: 'https://en.wikibooks.org/wiki/Cookbook:Pancakes_(North_American)',
    title: 'Cookbook:Pancakes (North American)',
    firstHeading: 'Ingredients',
    firstParagraph: 'North American pancakes are a type of',
    chrome: ['Hidden category', 'From Wikibooks, open books for an open world'],
    codeBlocks: 0,
    firstCodeLanguage: null,
    inlineCode: '',
    link: 'https://en.wikibooks.org/wiki/Cookbook:Pancake',
    listItem: '1 pinch salt',
    orderedStep: 'In a large bowl, mix dry ingredients together',
    kinds: [READER_BLOCK_KIND.Table, READER_BLOCK_KIND.List],
  },
  {
    file: 'wikipedia',
    url: 'https://en.wikipedia.org/wiki/Trench_coat',
    title: 'Trench coat',
    firstHeading: 'History',
    firstParagraph: 'A trench coat is a variety of coat',
    chrome: ['Jump to content', 'This page was last edited', 'Donate'],
    codeBlocks: 0,
    firstCodeLanguage: null,
    inlineCode: '',
    link: 'https://en.wikipedia.org/wiki/Gabardine',
    kinds: [READER_BLOCK_KIND.Image, READER_BLOCK_KIND.Heading],
  },
  {
    file: 'allbirds',
    url: 'https://www.allbirds.com/products/womens-tree-breezer-warm-camel-dark',
    title: "Women's Tree Breezer",
    firstHeading: 'Thoughtfully designed',
    firstParagraph: 'Lightweight, breathable, and effortlessly sleek',
    chrome: ['Notify me when back in stock', 'Oops! Something went wrong', '30% off'],
    codeBlocks: 0,
    firstCodeLanguage: null,
    inlineCode: '',
    link: '',
    listItem: 'Weight: 4.1 oz (W7)',
    kinds: [READER_BLOCK_KIND.List, READER_BLOCK_KIND.Image],
  },
  {
    file: 'taylorstitch',
    url: 'https://www.taylorstitch.com/products/sunset-cardigan-in-rust-terry-2611',
    title: 'The Sunset Cardigan in Rust Terry',
    firstHeading: '',
    firstParagraph: 'A relaxed take on the classic cardigan',
    chrome: ['Your Account', 'Recommendations For You', 'Get it by'],
    codeBlocks: 0,
    firstCodeLanguage: null,
    inlineCode: '',
    link: '',
    listItem: '14-oz. 100% organic cotton french terry.',
    kinds: [READER_BLOCK_KIND.List, READER_BLOCK_KIND.Image],
  },
];

function itemTexts(items: readonly ReaderListItem[]): string[] {
  return items.flatMap((item) => [
    item.spans.map((span) => span.text).join(''),
    ...itemTexts(item.items),
  ]);
}

function everything(article: ReaderArticle): string {
  return article.blocks
    .map((block) => [block.text, ...itemTexts(block.items), ...block.rows.flat()].join('\n'))
    .join('\n');
}

describe.each(PAGES)('a real page: $file', (page) => {
  const html = readFileSync(new URL(`../fixtures/real/${page.file}.html`, import.meta.url), 'utf8');
  const article = extractReaderArticle(html, 'Fallback title', page.url, NOW);

  it('reads like the article: title, lead and first section', () => {
    expect(article).not.toBeNull();
    const found = article as ReaderArticle;
    expect(found.title).toBe(page.title);
    const paragraph = found.blocks.find((block) => block.kind === READER_BLOCK_KIND.Paragraph);
    expect(paragraph?.text.startsWith(page.firstParagraph)).toBe(true);
    const heading = found.blocks.find((block) => block.kind === READER_BLOCK_KIND.Heading);
    expect(heading?.text ?? '').toBe(page.firstHeading);
    expect(found.minutes).toBeGreaterThanOrEqual(1);
    // The title is not repeated as the first block.
    expect(found.blocks[0]?.text).not.toBe(page.title);
  });

  it('leaves the page chrome out', () => {
    const text = everything(article as ReaderArticle);
    for (const chrome of page.chrome) {
      // The string really is in the page, so its absence says something.
      expect(html).toContain(chrome);
      expect(text).not.toContain(chrome);
    }
  });

  it('keeps code blocks and inline code, with the marked language', () => {
    const found = article as ReaderArticle;
    const codes = found.blocks.filter((block) => block.kind === READER_BLOCK_KIND.Code);
    expect(codes.length).toBeGreaterThanOrEqual(page.codeBlocks);
    if (page.codeBlocks > 0) {
      expect(codes[0]?.language).toBe(page.firstCodeLanguage);
      expect(codes.every((code) => code.text.trim() !== '')).toBe(true);
    }
    if (page.inlineCode !== '') {
      const inline = found.blocks.flatMap((block) => [
        ...block.spans,
        ...block.items.flatMap((item) => item.spans),
      ]);
      expect(inline.some((span) => span.code && span.text.includes(page.inlineCode))).toBe(true);
    }
  });

  it('keeps links as absolute http(s) targets, nothing else', () => {
    const found = article as ReaderArticle;
    const hrefs: string[] = [];
    const visit = (items: readonly ReaderListItem[]): void => {
      for (const item of items) {
        hrefs.push(...item.spans.flatMap((span) => (span.href === null ? [] : [span.href])));
        visit(item.items);
      }
    };
    for (const block of found.blocks) {
      hrefs.push(...block.spans.flatMap((span) => (span.href === null ? [] : [span.href])));
      visit(block.items);
      if (block.imageUrl !== null) hrefs.push(block.imageUrl);
    }
    if (page.link !== '') expect(hrefs).toContain(page.link);
    expect(hrefs.every((href) => /^https?:\/\/[^\s]+$/.test(href))).toBe(true);
    expect(hrefs.some((href) => /javascript:|data:/i.test(href))).toBe(false);
  });

  it('keeps lists as lists: ingredients, steps, details', () => {
    const found = article as ReaderArticle;
    const lists = found.blocks.filter((block) => block.kind === READER_BLOCK_KIND.List);
    if (page.listItem !== undefined) {
      expect(lists.flatMap((list) => itemTexts(list.items))).toContain(page.listItem);
    }
    if (page.orderedStep !== undefined) {
      const steps = lists.filter((list) => list.ordered).flatMap((list) => itemTexts(list.items));
      expect(steps.some((step) => step.startsWith(page.orderedStep ?? ''))).toBe(true);
    }
  });

  it('has the block kinds the page uses', () => {
    const kinds = new Set((article as ReaderArticle).blocks.map((block) => block.kind));
    for (const kind of page.kinds ?? []) expect(kinds.has(kind)).toBe(true);
  });

  it('is plain data: no markup, no script and no control characters', () => {
    const found = article as ReaderArticle;
    const prose = found.blocks.filter((block) => block.kind !== READER_BLOCK_KIND.Code);
    expect(JSON.stringify(prose)).not.toMatch(/<script|<style|onclick=|onerror=/i);
    // eslint-disable-next-line no-control-regex
    expect(everything(article as ReaderArticle)).not.toMatch(/[\u0000-\u0008\u000b-\u001f\u007f]/);
  });
});
