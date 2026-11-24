import { readFileSync } from 'node:fs';
import { READER_BLOCK_KIND, type ReaderArticle } from '@shelfmark/contracts';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import { cleanCode, cleanText, countWords } from './clean-text';
import { extractReaderArticle } from './extract-reader-article';
import { toPublishedAt } from './read-article-head';

const NOW = Date.parse('2026-11-24T12:00:00Z');

function fixture(name: string): string {
  return readFileSync(new URL(`../fixtures/${name}.html`, import.meta.url), 'utf8');
}

function allText(article: ReaderArticle): string {
  return article.blocks.map((block) => [block.text, ...block.items].join(' ')).join(' ');
}

const sentence =
  'This is an ordinary sentence of an article, long enough to count as real prose for the test.';

function paragraphs(count: number, words = sentence): string {
  return Array.from({ length: count }, () => `<p>${words} ${words}</p>`).join('');
}

describe('extractReaderArticle', () => {
  describe('an article page', () => {
    const article = extractReaderArticle(fixture('article'), 'Link title', NOW);

    it('reads the head: og:title, author and publication date', () => {
      expect(article).not.toBeNull();
      expect(article?.title).toBe('Slow bread at home');
      expect(article?.author).toBe('Mara Lindqvist');
      expect(article?.publishedAt).toBe('2026-03-14T08:30:00.000Z');
      expect(article?.minutes).toBe(1);
    });

    it('keeps the article blocks in order, typed, without the repeated title', () => {
      const kinds = article?.blocks.map((block) => block.kind);
      expect(kinds).toEqual([
        READER_BLOCK_KIND.Paragraph,
        READER_BLOCK_KIND.Paragraph,
        READER_BLOCK_KIND.Heading,
        READER_BLOCK_KIND.Paragraph,
        READER_BLOCK_KIND.List,
        READER_BLOCK_KIND.Quote,
        READER_BLOCK_KIND.Heading,
        READER_BLOCK_KIND.Paragraph,
        READER_BLOCK_KIND.Code,
        READER_BLOCK_KIND.Paragraph,
      ]);
      expect(article?.blocks[2]?.text).toBe('The overnight rise');
      expect(article?.blocks[4]?.items).toEqual([
        '500 g bread flour',
        '375 g cool water',
        '10 g salt',
        '2 g instant yeast',
      ]);
      expect(article?.blocks[5]?.text).toBe(
        'Time is the one ingredient you cannot buy, but it costs nothing.',
      );
      expect(article?.blocks[8]?.text).toBe(
        'bake(covered: 20 min, 250 °C)\nbake(open: 25 min, 230 °C)',
      );
      expect(article?.blocks.every((block) => block.imageUrl === null)).toBe(true);
    });

    it('drops chrome: navigation, share bar, related links, comments, sidebar, footer, forms, figures', () => {
      const text = allText(article as ReaderArticle);
      for (const chrome of [
        'Recipes',
        'Share this post',
        'Read more',
        'Ten quick pizzas',
        'Great post',
        'Subscribe',
        'Copyright',
        'Join',
        'The finished loaf',
        'never read',
      ]) {
        expect(text).not.toContain(chrome);
      }
    });
  });

  it('answers null for a page without an article (a shop)', () => {
    expect(extractReaderArticle(fixture('no-article'), 'Shoe', NOW)).toBeNull();
  });

  it('reads text written straight into a table cell with line breaks', () => {
    const article = extractReaderArticle(fixture('plain-text'), 'Plain', NOW);
    expect(article?.title).toBe('Notes on a plain old page');
    expect(article?.blocks.map((block) => block.kind)).toEqual([
      READER_BLOCK_KIND.Paragraph,
      READER_BLOCK_KIND.Paragraph,
      READER_BLOCK_KIND.Paragraph,
    ]);
    expect(allText(article as ReaderArticle)).not.toContain('Archive');
  });

  it('turns malicious markup into plain text only', () => {
    const html = fixture('malicious').replace(
      'Control characters such as',
      'Controls \u0000 \u001b[31m',
    );
    const article = extractReaderArticle(html, 'Fallback', NOW);
    expect(article).not.toBeNull();
    const text = allText(article as ReaderArticle);
    expect(text).not.toMatch(/never be read|written by a script|alert\(2\)/);
    // Markup written as text stays text; nothing is turned back into elements or URLs.
    expect(text).toContain('<script>alert(1)</script>');
    expect(text).toContain('link with a script URL');
    expect(text).not.toContain('javascript:');
    // eslint-disable-next-line no-control-regex
    expect(text).not.toMatch(/[\u0000-\u001f\u007f]/);
    expect(article?.title).toBe('<img src=x onerror=alert(1)>');
    expect(article?.author).toBeNull();
    expect(article?.publishedAt).toBeNull();
    expect(article?.blocks.every((block) => block.imageUrl === null)).toBe(true);
  });

  it('keeps a huge page within the block and text limits', () => {
    const html = `<html><body><article>${paragraphs(6_000)}</article></body></html>`;
    expect(html.length).toBeGreaterThan(READER_EXTRACT_LIMIT.HtmlCharsMax);
    const article = extractReaderArticle(html, 'Huge', NOW);
    expect(article).not.toBeNull();
    const blocks = article?.blocks ?? [];
    expect(blocks.length).toBeLessThanOrEqual(READER_EXTRACT_LIMIT.BlocksMax);
    const chars = blocks.reduce((sum, block) => sum + block.text.length, 0);
    expect(chars).toBeLessThanOrEqual(
      READER_EXTRACT_LIMIT.TextCharsMax + READER_EXTRACT_LIMIT.BlockCharsMax,
    );
  });

  it('cuts one giant paragraph and one giant list', () => {
    const giant = 'word '.repeat(5_000);
    const items = Array.from(
      { length: 300 },
      (_, i) => `<li>Item number ${i} of a very long list</li>`,
    ).join('');
    const html = `<html><body><article><p>${giant}</p><p>${sentence} ${sentence}</p><ul>${items}</ul></article></body></html>`;
    const article = extractReaderArticle(html, 'Giant', NOW);
    expect(article?.blocks[0]?.text.length).toBeLessThanOrEqual(READER_EXTRACT_LIMIT.BlockCharsMax);
    expect(article?.blocks[0]?.text.endsWith('…')).toBe(true);
    expect(article?.blocks[2]?.items).toHaveLength(READER_EXTRACT_LIMIT.ListItemsMax);
  });

  it('survives very deep nesting without overflowing the stack', () => {
    const depth = 20_000;
    const html = `<html><body>${'<div>'.repeat(depth)}${paragraphs(4)}${'</div>'.repeat(depth)}</body></html>`;
    expect(() => extractReaderArticle(html, 'Deep', NOW)).not.toThrow();
  });

  it('prefers the parent of an article split into sibling boxes', () => {
    const html = `<html><body><div id="story"><div>${paragraphs(3)}</div><div>${paragraphs(3)}</div></div><div class="x"><p>${sentence}</p></div></body></html>`;
    const article = extractReaderArticle(html, 'Split', NOW);
    expect(article?.blocks).toHaveLength(6);
  });

  it('falls back to a second pass when chrome words hide the whole page', () => {
    const html = `<html><body><div class="sidebar-layout">${paragraphs(4)}</div></body></html>`;
    expect(extractReaderArticle(html, 'Pass', NOW)?.blocks).toHaveLength(4);
  });

  it('uses the fallback title and the first <time> when the head names nothing', () => {
    const html = `<html><body><article><time datetime="2025-01-02">2 Jan</time>${paragraphs(4)}</article></body></html>`;
    const article = extractReaderArticle(html, 'Fallback title', NOW);
    expect(article?.title).toBe('Fallback title');
    expect(article?.publishedAt).toBe('2025-01-02T00:00:00.000Z');
  });

  it('answers null for an empty or text-free document', () => {
    expect(extractReaderArticle('', 'Empty', NOW)).toBeNull();
    expect(extractReaderArticle('<html><body><img src="x"></body></html>', 'Img', NOW)).toBeNull();
  });
});

describe('reader text helpers', () => {
  it('cleanText collapses whitespace, strips controls and cuts at a word', () => {
    expect(cleanText('  a \n\t b\u0000c ', 10)).toBe('a b c');
    expect(cleanText('alpha beta gamma delta', 12)).toBe('alpha beta…');
    expect(cleanText('abcdefghijklmnop', 6)).toBe('abcde…');
  });

  it('cleanCode keeps lines and tabs, drops edges and controls', () => {
    expect(cleanCode('\r\n\n  a\r\n\tb  \u0007\n\n', 100)).toBe('  a\n\tb');
    expect(cleanCode('abcdef', 4)).toBe('abc…');
  });

  it('countWords counts runs of non-space characters', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('  one two\nthree ')).toBe(3);
  });

  it('toPublishedAt keeps sane dates only', () => {
    expect(toPublishedAt(undefined, NOW)).toBeNull();
    expect(toPublishedAt('1980-01-01', NOW)).toBeNull();
    expect(toPublishedAt('2030-01-01', NOW)).toBeNull();
    expect(toPublishedAt(' 2026-01-05T10:00:00+01:00 ', NOW)).toBe('2026-01-05T09:00:00.000Z');
  });
});
