import { escapeHtml, safeHref } from './escape-html';

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });
});

describe('safeHref', () => {
  it('keeps http and https', () => {
    expect(safeHref(' https://a.example/x ')).toBe('https://a.example/x');
    expect(safeHref('http://a.example')).toBe('http://a.example/');
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:1',
    'data:text/html,x',
    'file:///etc/passwd',
    'nope',
    '',
  ])('rejects %s', (value) => {
    expect(safeHref(value)).toBeNull();
  });
});
