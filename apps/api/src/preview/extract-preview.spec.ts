import { extractPreview, fallbackPreview } from './extract-preview';

const PAGE = 'https://example.com/articles/one';

function page(head: string, body = ''): string {
  return `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
}

describe('extractPreview', () => {
  it('prefers og:title, then twitter:title, then <title>', () => {
    const og = page(
      '<title>T</title><meta name="twitter:title" content="TW"><meta property="og:title" content="OG">',
    );
    expect(extractPreview(og, PAGE).title).toBe('OG');
    const tw = page('<title>T</title><meta name="twitter:title" content="TW">');
    expect(extractPreview(tw, PAGE).title).toBe('TW');
    expect(extractPreview(page('<title>  Plain\n  title </title>'), PAGE).title).toBe(
      'Plain title',
    );
  });

  it('skips empty titles and falls back to the URL', () => {
    const empty = page('<meta property="og:title" content="  "><title></title>');
    expect(extractPreview(empty, PAGE).title).toBe(PAGE);
    expect(extractPreview('', PAGE).title).toBe(PAGE);
  });

  it('limits the title to 300 characters without cutting a surrogate pair', () => {
    const long = '😀'.repeat(400);
    const { title } = extractPreview(page(`<title>${long}</title>`), PAGE);
    expect(Array.from(title)).toHaveLength(300);
    expect(title).toBe('😀'.repeat(300));
  });

  it('reads the description in priority order', () => {
    const html = page(
      '<meta name="description" content="plain"><meta name="twitter:description" content="tw"><meta property="og:description" content="og">',
    );
    expect(extractPreview(html, PAGE).description).toBe('og');
    expect(
      extractPreview(page('<meta name="description" content="plain">'), PAGE).description,
    ).toBe('plain');
    expect(extractPreview(page(''), PAGE).description).toBeNull();
  });

  it('resolves images against the page URL and keeps only http(s)', () => {
    const rel = page('<meta property="og:image" content="/img/cover.png">');
    expect(extractPreview(rel, PAGE).imageUrl).toBe('https://example.com/img/cover.png');
    const abs = page('<meta name="twitter:image" content="http://cdn.test/a.jpg">');
    expect(extractPreview(abs, PAGE).imageUrl).toBe('http://cdn.test/a.jpg');
    const js = page('<meta property="og:image" content="javascript:alert(1)">');
    expect(extractPreview(js, PAGE).imageUrl).toBeNull();
    const data = page('<meta property="og:image" content="data:image/png;base64,AAAA">');
    expect(extractPreview(data, PAGE).imageUrl).toBeNull();
    const bad = page('<meta property="og:image" content="http://[broken">');
    expect(extractPreview(bad, PAGE).imageUrl).toBeNull();
    expect(extractPreview(page(''), PAGE).imageUrl).toBeNull();
  });

  it('finds the favicon and falls back to /favicon.ico', () => {
    const link = page('<link rel="shortcut icon" href="icons/f.png">');
    expect(extractPreview(link, PAGE).faviconUrl).toBe('https://example.com/articles/icons/f.png');
    const apple = page('<link rel="apple-touch-icon" href="/apple.png">');
    expect(extractPreview(apple, PAGE).faviconUrl).toBe('https://example.com/apple.png');
    const unsafe = page('<link rel="icon" href="javascript:1"><link rel="icon" href=" ">');
    expect(extractPreview(unsafe, PAGE).faviconUrl).toBe('https://example.com/favicon.ico');
    expect(extractPreview(page(''), PAGE).faviconUrl).toBe('https://example.com/favicon.ico');
  });

  it('returns the page URL and ignores markup in text', () => {
    const html = page('<title>&lt;b&gt;x&lt;/b&gt;</title>');
    const preview = extractPreview(html, PAGE);
    expect(preview.url).toBe(PAGE);
    expect(preview.title).toBe('<b>x</b>');
  });

  it('survives deeply nested and broken markup', () => {
    const deep = `${'<div>'.repeat(20_000)}<meta property="og:title" content="deep">`;
    expect(() => extractPreview(deep, PAGE)).not.toThrow();
    expect(() => extractPreview('<meta <<< <title', PAGE)).not.toThrow();
  });

  it('ignores everything after </head> and past the parse cap', () => {
    const late = page('<title>head</title>', '<meta property="og:title" content="late">');
    expect(extractPreview(late, PAGE).title).toBe('head');
    const padded = `<title>x</title>${' '.repeat(70_000)}<meta property="og:title" content="far">`;
    expect(extractPreview(padded, PAGE).title).toBe('x');
  });

  it.each([
    ['javascript:alert(1)'],
    ['data:image/png;base64,AAAA'],
    ['https://user:pass@cdn.example.com/a.png'],
    [`https://cdn.example.com/${'a'.repeat(2_100)}.png`],
  ])('rejects the image URL %#', (value) => {
    const html = page(`<meta property="og:image" content="${value}">`);
    expect(extractPreview(html, PAGE).imageUrl).toBeNull();
  });

  it('rejects unsafe favicon URLs and falls back to /favicon.ico', () => {
    const html = page(
      '<link rel="icon" href="javascript:alert(1)"><link rel="icon" href="https://u:p@x.com/i.ico">',
    );
    expect(extractPreview(html, PAGE).faviconUrl).toBe('https://example.com/favicon.ico');
  });

  it('resolves relative URLs against an http(s) <base href> only', () => {
    const withBase = page(
      '<base href="https://cdn.example.org/assets/"><meta property="og:image" content="a.png">',
    );
    expect(extractPreview(withBase, PAGE).imageUrl).toBe('https://cdn.example.org/assets/a.png');
    const badBase = page(
      '<base href="javascript:alert(1)"><meta property="og:image" content="/a.png">',
    );
    expect(extractPreview(badBase, PAGE).imageUrl).toBe('https://example.com/a.png');
  });

  it('falls back to name when property is not a known key', () => {
    const html = page('<meta property="x:other" name="description" content="from name">');
    expect(extractPreview(html, PAGE).description).toBe('from name');
  });

  it('parses 64 KB of pathological markup quickly', () => {
    const inputs = [
      '<b><i>'.repeat(10_800),
      '<table><tr><td>'.repeat(4_300),
      '<svg><g>'.repeat(8_200),
      '<a><b><a><b>'.repeat(5_400),
    ];
    const start = performance.now();
    for (const input of inputs) {
      extractPreview(`<title>t</title>${input}`, PAGE);
    }
    expect(performance.now() - start).toBeLessThan(1_500);
  });

  it('reads meta tags inside templates', () => {
    const html = `<template><meta property="og:title" content="in template"></template>`;
    expect(extractPreview(html, PAGE).title).toBe('in template');
  });
});

describe('fallbackPreview', () => {
  it('uses the URL as title', () => {
    expect(fallbackPreview(PAGE)).toEqual({
      url: PAGE,
      title: PAGE,
      description: null,
      imageUrl: null,
      faviconUrl: 'https://example.com/favicon.ico',
    });
  });

  it('handles a value that is not a URL', () => {
    expect(fallbackPreview('nope')).toEqual({
      url: 'nope',
      title: 'nope',
      description: null,
      imageUrl: null,
      faviconUrl: null,
    });
  });
});
