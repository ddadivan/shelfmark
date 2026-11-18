import { extractExcerpt } from './extract-excerpt';

describe('extractExcerpt', () => {
  it('reads the body text and collapses whitespace', () => {
    const html = '<html><body><h1>Hello</h1>\n\n<p>  big   world </p></body></html>';
    expect(extractExcerpt(html)).toBe('Hello big world');
  });

  it('drops scripts, styles, navigation, header, footer, aside, svg, templates and forms', () => {
    const html = `<body>
      <header>HEADER</header><nav>NAV</nav>
      <script>var secret = 1;</script><style>.a{}</style><noscript>NOSCRIPT</noscript>
      <svg><text>SVG</text></svg><template><p>TEMPLATE</p></template>
      <aside>ASIDE</aside><form><input value="FORM"><button>BUTTON</button></form>
      <p>Real content</p><footer>FOOTER</footer></body>`;
    expect(extractExcerpt(html)).toBe('Real content');
  });

  it('prefers main, then article, over the rest of the body', () => {
    expect(
      extractExcerpt(
        '<body><div>Noise</div><main><p>Main text</p></main><article>Art</article></body>',
      ),
    ).toBe('Main text');
    expect(extractExcerpt('<body><div>Noise</div><article>Article text</article></body>')).toBe(
      'Article text',
    );
  });

  it('does not take a main that sits inside a skipped element', () => {
    expect(extractExcerpt('<body><nav><main>Hidden</main></nav><p>Visible</p></body>')).toBe(
      'Visible',
    );
  });

  it('replaces control characters and cuts to 6,000 characters', () => {
    expect(extractExcerpt('<body>a\u0007b\u001bc</body>')).toBe('a b c');
    const long = `<body><p>${'word '.repeat(5000)}</p></body>`;
    const excerpt = extractExcerpt(long);
    expect(excerpt).not.toBeNull();
    expect((excerpt ?? '').length).toBeLessThanOrEqual(6000);
    expect((excerpt ?? '').length).toBeGreaterThan(5900);
  });

  it('answers null when nothing readable is left', () => {
    expect(extractExcerpt('')).toBeNull();
    expect(extractExcerpt('<body><script>x</script>   </body>')).toBeNull();
  });

  it('survives deeply nested markup', () => {
    const html = `<body>${'<div>'.repeat(20000)}deep</body>`;
    expect(extractExcerpt(html)).toContain('deep');
  });

  it('keeps markup in text as text, not as elements', () => {
    expect(extractExcerpt('<body>&lt;img src=x onerror=alert(1)&gt;</body>')).toBe(
      '<img src=x onerror=alert(1)>',
    );
  });
});
