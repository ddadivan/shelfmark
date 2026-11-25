import { READER_ARTICLE_VERSION, READER_BLOCK_KIND } from '@shelfmark/contracts';
import { newBlock } from './extract/new-block';
import { parseStoredArticle, storedArticleVersion } from './parse-stored-article';

const span = { text: 'Hello', href: null, code: false, emphasis: false, strong: false };

const valid = {
  version: READER_ARTICLE_VERSION,
  title: 'T',
  author: null,
  publishedAt: '2026-01-01T00:00:00.000Z',
  minutes: 2,
  blocks: [
    newBlock(READER_BLOCK_KIND.Paragraph, { text: 'Hello', spans: [span] }),
    newBlock(READER_BLOCK_KIND.List, {
      ordered: true,
      items: [{ spans: [span], items: [{ spans: [span], items: [] }] }],
    }),
    newBlock(READER_BLOCK_KIND.Heading, { text: 'H', spans: [span], level: 3 }),
    newBlock(READER_BLOCK_KIND.Code, { text: 'a', language: 'ts' }),
    newBlock(READER_BLOCK_KIND.Table, { rows: [['a', 'b']], header: true }),
    newBlock(READER_BLOCK_KIND.Note, { label: 'Tip', text: 'Hello', spans: [span] }),
  ],
};

/** A version 1 article: plain text, list items were strings, no version. */
const legacy = {
  title: 'T',
  author: 'A',
  publishedAt: null,
  minutes: 2,
  blocks: [
    { kind: 'heading', text: 'Head', items: [], imageUrl: null },
    { kind: 'paragraph', text: 'Hello', items: [], imageUrl: null },
    { kind: 'list', text: '', items: ['a', 'b'], imageUrl: null },
  ],
};

describe('parseStoredArticle', () => {
  it('reads a stored article back', () => {
    expect(parseStoredArticle(valid)).toEqual(valid);
  });

  it('upgrades a version 1 article to spans and says it is old', () => {
    expect(storedArticleVersion(legacy)).toBe(1);
    expect(storedArticleVersion(valid)).toBe(READER_ARTICLE_VERSION);
    const article = parseStoredArticle(legacy);
    expect(article?.version).toBe(READER_ARTICLE_VERSION);
    expect(article?.blocks[0]).toMatchObject({ kind: 'heading', level: 2, text: 'Head' });
    expect(article?.blocks[1]?.spans).toEqual([{ ...span }]);
    expect(article?.blocks[2]?.items.map((item) => item.spans[0]?.text)).toEqual(['a', 'b']);
  });

  it('checks stored links and image sources again', () => {
    const bad = { ...span, text: 'x', href: 'javascript:alert(1)' };
    const good = { ...span, text: 'y', href: 'https://ok.test/a' };
    const stored = {
      ...valid,
      blocks: [
        newBlock(READER_BLOCK_KIND.Paragraph, { text: 'xy', spans: [bad, good] }),
        newBlock(READER_BLOCK_KIND.Image, { imageUrl: 'data:image/png;base64,AA', alt: 'a' }),
        newBlock(READER_BLOCK_KIND.Image, { imageUrl: 'https://ok.test/i.png', alt: 'a' }),
      ],
    };
    const article = parseStoredArticle(stored);
    expect(article?.blocks[0]?.spans.map((s) => s.href)).toEqual([null, 'https://ok.test/a']);
    expect(article?.blocks[1]?.imageUrl).toBeNull();
    expect(article?.blocks[2]?.imageUrl).toBe('https://ok.test/i.png');
  });

  it('answers null for a version newer than this code knows', () => {
    expect(parseStoredArticle({ ...valid, version: READER_ARTICLE_VERSION + 1 })).toBeNull();
  });

  const block = valid.blocks[0];
  it.each([
    ['not an object', 'text'],
    ['an array', []],
    ['null', null],
    ['a missing title', { ...valid, title: undefined }],
    ['a wrong author', { ...valid, author: 3 }],
    ['a wrong date', { ...valid, publishedAt: false }],
    ['zero minutes', { ...valid, minutes: 0 }],
    ['fractional minutes', { ...valid, minutes: 1.5 }],
    ['no blocks', { ...valid, blocks: 'x' }],
    ['an unknown kind', { ...valid, blocks: [{ ...block, kind: 'html' }] }],
    ['a block that is no object', { ...valid, blocks: [1] }],
    ['a wrong text', { ...valid, blocks: [{ ...block, text: 1 }] }],
    ['wrong items', { ...valid, blocks: [{ ...block, items: [1] }] }],
    ['missing items', { ...valid, blocks: [{ ...block, items: undefined }] }],
    ['wrong spans', { ...valid, blocks: [{ ...block, spans: [{ text: 1 }] }] }],
    [
      'a span without flags',
      { ...valid, blocks: [{ ...block, spans: [{ text: 'a', href: null }] }] },
    ],
    ['a wrong level', { ...valid, blocks: [{ ...block, level: 7 }] }],
    ['wrong rows', { ...valid, blocks: [{ ...block, rows: [[1]] }] }],
    ['a wrong label', { ...valid, blocks: [{ ...block, label: 4 }] }],
    ['a wrong flag', { ...valid, blocks: [{ ...block, ordered: 'yes' }] }],
    [
      'a v1 block with wrong items',
      { ...legacy, blocks: [{ kind: 'list', text: '', items: [1] }] },
    ],
    ['a v1 block that is no object', { ...legacy, blocks: ['x'] }],
  ])('answers null for %s', (_name, value) => {
    expect(parseStoredArticle(value)).toBeNull();
  });
});
