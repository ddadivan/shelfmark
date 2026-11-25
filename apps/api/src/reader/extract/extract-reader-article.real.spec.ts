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
    file: 'devto',
    url: 'https://dev.to/sylwia-lask/mcp-is-dead-simple-and-thats-exactly-the-problem-5811',
    title: "MCP Is Dead Simple. And That's Exactly the Problem",
    firstHeading: '🤔 What Exactly Is MCP?',
    firstParagraph: 'What exactly is MCP?',
    chrome: ['Create account', 'Add reaction', 'Top comments', 'Report abuse'],
    codeBlocks: 2,
    firstCodeLanguage: null,
    inlineCode: 'any',
    link: 'https://dev.to/sylwia-lask/the-dirty-secret-behind-ai-agents-demo--273d',
  },
  {
    file: 'habr',
    url: 'https://habr.com/ru/articles/1111954/',
    title: 'Яндекс Браузер официально отменил анонимность. Спойлер: похоже, её и не было',
    firstHeading: '',
    firstParagraph: 'Я тут наткнулся на новость',
    chrome: ['Войти', 'Регистрация', 'Комментарии', 'Теги:'],
    codeBlocks: 0,
    firstCodeLanguage: null,
    inlineCode: '',
    link: 'https://www.cnews.ru/news/top/2026-11-23_iz_litsenzionnogo_soglasheniya',
    kinds: [READER_BLOCK_KIND.Image],
  },
  {
    file: 'overreacted',
    url: 'https://overreacted.io/a-complete-guide-to-useeffect/',
    title: 'A Complete Guide to useEffect',
    firstHeading: 'TLDR',
    firstParagraph: 'You wrote a few components with',
    chrome: ['Pay what you like', 'March 9, 2019'],
    codeBlocks: 4,
    firstCodeLanguage: 'jsx',
    inlineCode: 'useEffect',
    link: 'https://reactjs.org/docs/hooks-intro.html',
    kinds: [READER_BLOCK_KIND.Quote, READER_BLOCK_KIND.List],
  },
  {
    file: 'csstricks',
    url: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/',
    title: 'A Complete CSS Flexbox Layout Guide',
    firstHeading: 'Properties for the Parent (Flex Container)',
    firstParagraph: 'The `Flexbox Layout`'.replace(/`/g, ''),
    chrome: [
      'Skip to main content',
      'Sponsor CSS-Tricks!',
      'CSS Flexbox Table of Contents',
      'Leave a Reply',
    ],
    codeBlocks: 4,
    firstCodeLanguage: 'css',
    inlineCode: 'flex-direction',
    link: 'https://css-tricks.com/complete-guide-css-grid-layout/',
    kinds: [READER_BLOCK_KIND.Image],
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
    file: 'smashing',
    url: 'https://www.smashingmagazine.com/2026/10/embracing-playful-imperfection-css-random-function/',
    title: 'Embracing Playful Imperfection With The CSS random() Function',
    firstHeading: 'The Charm Of Things Not Being 100% Straight',
    firstParagraph: 'Design systems thrive on consistency',
    chrome: [
      'Write for us',
      'Jump to all topics',
      'Browse All Smashing Magazine Topics',
      'About The Author',
    ],
    codeBlocks: 4,
    firstCodeLanguage: 'css',
    inlineCode: 'random()',
    link: 'https://drafts.csswg.org/css-values-5/#random',
    kinds: [READER_BLOCK_KIND.Quote],
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
    expect(hrefs).toContain(page.link);
    expect(hrefs.every((href) => /^https?:\/\/[^\s]+$/.test(href))).toBe(true);
    expect(hrefs.some((href) => /javascript:|data:/i.test(href))).toBe(false);
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
