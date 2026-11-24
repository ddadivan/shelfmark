import { READER_BLOCK_KIND } from '@shelfmark/contracts';
import { parseStoredArticle } from './parse-stored-article';

const valid = {
  title: 'T',
  author: null,
  publishedAt: '2026-01-01T00:00:00.000Z',
  minutes: 2,
  blocks: [
    { kind: READER_BLOCK_KIND.Paragraph, text: 'Hello', items: [], imageUrl: null },
    { kind: READER_BLOCK_KIND.List, text: '', items: ['a', 'b'], imageUrl: null },
  ],
};

describe('parseStoredArticle', () => {
  it('reads a stored article back', () => {
    expect(parseStoredArticle(valid)).toEqual(valid);
  });

  it('never answers an image URL', () => {
    const stored = {
      ...valid,
      blocks: [{ kind: READER_BLOCK_KIND.Image, text: 'c', items: [], imageUrl: 'https://x' }],
    };
    expect(parseStoredArticle(stored)?.blocks[0]?.imageUrl).toBeNull();
  });

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
    ['an unknown kind', { ...valid, blocks: [{ kind: 'html', text: '', items: [] }] }],
    ['a block that is no object', { ...valid, blocks: [1] }],
    ['a wrong text', { ...valid, blocks: [{ kind: 'paragraph', text: 1, items: [] }] }],
    ['wrong items', { ...valid, blocks: [{ kind: 'list', text: '', items: [1] }] }],
    ['missing items', { ...valid, blocks: [{ kind: 'list', text: '' }] }],
  ])('answers null for %s', (_name, value) => {
    expect(parseStoredArticle(value)).toBeNull();
  });
});
