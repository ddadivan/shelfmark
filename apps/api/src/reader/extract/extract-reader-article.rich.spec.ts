import { READER_BLOCK_KIND, type ReaderArticle, type ReaderBlock } from '@shelfmark/contracts';
import { extractReaderArticle } from './extract-reader-article';

const NOW = Date.parse('2026-11-24T12:00:00Z');
const PAGE = 'https://docs.example.com/guide/start';

const filler =
  'This is an ordinary sentence of an article, long enough to count as real prose for the test of the reader.';

function prose(count = 4): string {
  return Array.from(
    { length: count },
    (_, index) => `<p>${filler} ${filler} Part ${index}.</p>`,
  ).join('');
}

function read(body: string, url: string | null = PAGE): ReaderArticle {
  const html = `<html><head><title>Guide</title></head><body><article>${body}${prose()}</article></body></html>`;
  const article = extractReaderArticle(html, 'Fallback', url, NOW);
  expect(article).not.toBeNull();
  return article as ReaderArticle;
}

function find(article: ReaderArticle, kind: ReaderBlock['kind']): ReaderBlock {
  const block = article.blocks.find((candidate) => candidate.kind === kind);
  expect(block).toBeDefined();
  return block as ReaderBlock;
}

describe('extractReaderArticle with rich markup', () => {
  it('keeps inline code, links, emphasis and strong as typed spans', () => {
    const article = read(
      '<p>Call <code>fetch()</code> and read <a href="/api/response">the response</a>, <em>then</em> <strong>stop</strong> <a href="https://other.test/x"><code>x</code></a>.</p>',
    );
    const spans = article.blocks[0]?.spans ?? [];
    expect(spans.map((span) => span.text).join('')).toBe(
      'Call fetch() and read the response, then stop x.',
    );
    expect(spans.find((span) => span.text === 'fetch()')).toMatchObject({ code: true, href: null });
    expect(spans.find((span) => span.text === 'the response')?.href).toBe(
      'https://docs.example.com/api/response',
    );
    expect(spans.find((span) => span.text === 'then')?.emphasis).toBe(true);
    expect(spans.find((span) => span.text === 'stop')?.strong).toBe(true);
    expect(spans.find((span) => span.text === 'x')).toMatchObject({
      code: true,
      href: 'https://other.test/x',
    });
  });

  it('keeps only absolute http(s) link targets', () => {
    const article = read(
      '<p>Links of every sort in one paragraph, <a href="javascript:alert(1)">js</a> <a href="data:text/html,x">data</a> <a href="mailto:a@b.c">mail</a> <a href="#part">part</a> <a href="https://u:p@evil.test/">cred</a> <a href="//cdn.test/a">proto</a> <a href="http://ok.test/">ok</a>, and the rest of a sentence.</p>',
    );
    const hrefs = (article.blocks[0]?.spans ?? []).map((span) => span.href).filter(Boolean);
    expect(hrefs).toEqual(['https://cdn.test/a', 'http://ok.test/']);
    expect(article.blocks[0]?.text).toContain('js data mail part cred');
  });

  it('drops relative links when the page address is unknown', () => {
    const article = read('<p>See <a href="/relative">this</a>.</p>', null);
    expect(article.blocks[0]?.spans.every((span) => span.href === null)).toBe(true);
    expect(article.blocks[0]?.text).toBe('See this.');
  });

  it('reads h2 to h4 as heading levels and the first h1 as the title', () => {
    const article = read(
      '<h1>Real title</h1><h2>Two</h2><p>Text under two.</p><h3>Three</h3><p>Text under three.</p><h4>Four</h4><p>Text under four.</p><h5>Five</h5><p>Text under five.</p><h6>Six</h6><p>Text under six.</p>',
    );
    expect(article.title).toBe('Real title');
    const headings = article.blocks.filter((block) => block.kind === READER_BLOCK_KIND.Heading);
    expect(headings.map((block) => [block.text, block.level])).toEqual([
      ['Two', 2],
      ['Three', 3],
      ['Four', 4],
      ['Five', 4],
      ['Six', 4],
    ]);
  });

  it('keeps ordered, unordered and nested lists', () => {
    const article = read(
      '<ol><li>One<ul><li>Inner <code>a</code></li><li>Inner b</li></ul></li><li>Two</li></ol>',
    );
    const list = find(article, READER_BLOCK_KIND.List);
    expect(list.ordered).toBe(true);
    expect(list.items).toHaveLength(2);
    expect(list.items[0]?.spans.map((span) => span.text).join('')).toBe('One');
    expect(list.items[0]?.items.map((item) => item.spans.map((s) => s.text).join(''))).toEqual([
      'Inner a',
      'Inner b',
    ]);
    expect(list.items[0]?.items[0]?.spans[1]?.code).toBe(true);
  });

  it('reads a callout as a note with its label', () => {
    const article = read(
      '<div class="docs-callout docs-callout-warning"><h3>Warning</h3><p>Do not <code>eval</code> this.</p></div>' +
        '<aside class="notecard"><p><strong>Note:</strong> Mind the gap.</p></aside>',
    );
    const notes = article.blocks.filter((block) => block.kind === READER_BLOCK_KIND.Note);
    expect(notes.map((note) => [note.label, note.text])).toEqual([
      ['Warning', 'Do not eval this.'],
      ['Note', 'Mind the gap.'],
    ]);
    expect(notes[0]?.spans.some((span) => span.code)).toBe(true);
  });

  it('keeps code blocks with line breaks and the marked language, without copy buttons', () => {
    const article = read(
      '<div class="code-example"><button>Copy</button><pre class="language-typescript"><code>const a = 1;\nconst b = 2;</code></pre></div>' +
        '<pre class="brush: js notranslate"><code>run();</code></pre>' +
        '<pre><code>plain</code></pre>' +
        '<pre class="shiki"><code><span class="line">x = 1</span>\n<span class="line">y = 2</span></code></pre>',
    );
    const codes = article.blocks.filter((block) => block.kind === READER_BLOCK_KIND.Code);
    expect(codes.map((code) => [code.language, code.text])).toEqual([
      ['typescript', 'const a = 1;\nconst b = 2;'],
      ['js', 'run();'],
      [null, 'plain'],
      [null, 'x = 1\ny = 2'],
    ]);
  });

  it('reads a simple table as rows of text with a header', () => {
    const article = read(
      '<table><thead><tr><th>Name</th><th>Type</th></tr></thead><tbody><tr><td><code>id</code></td><td>number</td></tr><tr><td>name</td><td>string</td></tr></tbody></table>',
    );
    const table = find(article, READER_BLOCK_KIND.Table);
    expect(table.header).toBe(true);
    expect(table.rows).toEqual([
      ['Name', 'Type'],
      ['id', 'number'],
      ['name', 'string'],
    ]);
  });

  it('reads figures as images with absolute source, alt and caption, and skips icons', () => {
    const article = read(
      '<figure><img src="/img/a.png" alt="A chart"><figcaption>Figure 1: a chart</figcaption></figure>' +
        '<p><img src="https://cdn.test/avatar/me.png" alt=""></p>' +
        '<img src="data:image/png;base64,AAAA" alt="inline">' +
        '<img src="https://cdn.test/b.png" width="16" height="16">' +
        '<picture><source srcset="https://cdn.test/c.webp 1x, https://cdn.test/c2.webp 2x"><img alt="Lazy" data-src="https://cdn.test/c.png"></picture>',
    );
    const images = article.blocks.filter((block) => block.kind === READER_BLOCK_KIND.Image);
    expect(images.map((image) => [image.imageUrl, image.alt, image.text])).toEqual([
      ['https://docs.example.com/img/a.png', 'A chart', 'Figure 1: a chart'],
      ['https://cdn.test/c.png', 'Lazy', ''],
    ]);
  });

  it('drops a table of contents, edit links, breadcrumbs and a trailing related list', () => {
    const article = read(
      prose(3) +
        '<nav class="breadcrumb"><a href="/">Docs</a></nav>' +
        '<h2>On this page</h2><ul><li><a href="#a">Alpha</a></li><li><a href="#b">Beta</a></li></ul>' +
        '<a class="edit-link" href="/edit">Edit this page</a>' +
        '<h2>Alpha</h2><p>Body text of the alpha section that is long enough to stay.</p>' +
        '<h2>Related articles</h2><ul><li><a href="/x">Other thing</a></li></ul>' +
        '<h2>Another heading after related</h2>',
    );
    const text = article.blocks.map((block) => block.text).join(' ');
    expect(text).not.toMatch(/On this page|Edit this page|Docs|Related articles|Other thing/);
    expect(article.blocks.some((block) => block.kind === READER_BLOCK_KIND.List)).toBe(false);
    expect(text).toContain('Alpha');
  });

  it('strips scripts, styles and event handlers and never copies markup', () => {
    const article = read(
      '<p onclick="steal()">Hello <script>steal()</script><style>p{}</style><span style="display:none">hidden</span> world, this is a sentence.</p>',
    );
    expect(article.blocks[0]?.text).toBe('Hello world, this is a sentence.');
    expect(JSON.stringify(article)).not.toMatch(/steal|onclick|<script|display/);
  });

  it('removes the site name from the page title', () => {
    const html = `<html><head><title>Great guide | Docs Example</title></head><body><article>${prose()}</article></body></html>`;
    expect(extractReaderArticle(html, 'F', 'https://docs.example.com/x', NOW)?.title).toBe(
      'Great guide',
    );
  });

  it('keeps nested lists and spans within their limits', () => {
    const deep = '<ul>'.repeat(10) + '<li>deep</li>' + '</ul>'.repeat(10);
    const article = read(`<ul><li>top${deep}</li></ul>`);
    const depthOf = (items: ReaderBlock['items']): number =>
      items.length === 0 ? 0 : 1 + Math.max(...items.map((item) => depthOf(item.items)));
    expect(depthOf(find(article, READER_BLOCK_KIND.List).items)).toBeLessThanOrEqual(4);
  });
});
