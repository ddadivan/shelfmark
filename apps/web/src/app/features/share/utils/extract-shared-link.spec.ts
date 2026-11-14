import { LINK_LIMIT } from '@shelfmark/contracts';
import { extractSharedLink } from './extract-shared-link';

describe('extractSharedLink', () => {
  it('takes the url parameter', () => {
    expect(extractSharedLink({ url: 'https://example.com/a' }).url).toBe('https://example.com/a');
  });

  it('finds the first URL in a sentence, without its trailing punctuation', () => {
    expect(
      extractSharedLink({ text: 'Look https://example.com/a, nice. https://b.example' }).url,
    ).toBe('https://example.com/a');
    expect(extractSharedLink({ text: 'see (https://example.com/a)!' }).url).toBe(
      'https://example.com/a',
    );
  });

  it('keeps balanced parentheses of the address', () => {
    const wiki = 'https://en.wikipedia.org/wiki/Angular_(web_framework)';
    expect(extractSharedLink({ text: wiki }).url).toBe(wiki);
  });

  it('prefers url over text and falls back to text', () => {
    expect(extractSharedLink({ url: 'https://a.example/', text: 'https://b.example/' }).url).toBe(
      'https://a.example/',
    );
    expect(extractSharedLink({ url: 'not a url', text: 'x https://b.example/' }).url).toBe(
      'https://b.example/',
    );
  });

  it('accepts http and a mixed-case scheme', () => {
    expect(extractSharedLink({ text: 'HTTP://Example.com/x' }).url).toBe('http://example.com/x');
  });

  it('never reads the title as a URL source', () => {
    expect(extractSharedLink({ title: 'https://example.com/a' }).url).toBeNull();
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'intent://scan/#Intent;scheme=zxing;end',
    'ftp://example.com/a',
    'blob:https://example.com/uuid',
    'vbscript:msgbox(1)',
    '//example.com/a',
    'example.com/a',
    '',
  ])('rejects %j', (value) => {
    expect(extractSharedLink({ url: value }).url).toBeNull();
    expect(extractSharedLink({ text: value }).url).toBeNull();
  });

  it('does not let a hostile scheme through control characters', () => {
    expect(extractSharedLink({ url: 'java\tscript:alert(1)' }).url).toBeNull();
    expect(extractSharedLink({ url: 'java\nscript:alert(1)' }).url).toBeNull();
    expect(extractSharedLink({ url: '\u0000javascript:alert(1)' }).url).toBeNull();
  });

  it('strips control and bidi characters around the address', () => {
    expect(
      extractSharedLink({ text: `go\u0000 https://example.com/a${String.fromCharCode(0x200b)}` })
        .url,
    ).toBe('https://example.com/a');
  });

  it('rejects an address with credentials', () => {
    expect(extractSharedLink({ url: 'https://google.com@evil.example/' }).url).toBeNull();
    expect(extractSharedLink({ url: 'https://user:pass@example.com/' }).url).toBeNull();
  });

  it('rejects an address longer than the contract allows', () => {
    const long = `https://example.com/${'a'.repeat(LINK_LIMIT.UrlMax)}`;
    expect(extractSharedLink({ url: long }).url).toBeNull();
  });

  it('ignores non-string values', () => {
    expect(extractSharedLink({ url: ['https://example.com/'], text: 5, title: {} })).toEqual({
      url: null,
      titleHint: '',
    });
    expect(extractSharedLink({})).toEqual({ url: null, titleHint: '' });
  });

  it('stays fast on a huge hostile input', () => {
    const started = Date.now();
    const result = extractSharedLink({
      text: `https://${'a'.repeat(1_000_000)}`,
      title: 'x'.repeat(1_000_000),
    });
    expect(Date.now() - started).toBeLessThan(500);
    expect(result.url).toBeNull();
    expect(result.titleHint.length).toBeLessThanOrEqual(LINK_LIMIT.TitleMax);
  });

  it('cleans and caps the title hint, leaving markup as plain text', () => {
    expect(extractSharedLink({ title: '  Wool\u0000 coat\n\n<b>x</b>  ' }).titleHint).toBe(
      'Wool coat <b>x</b>',
    );
    expect(
      extractSharedLink({ title: 't'.repeat(LINK_LIMIT.TitleMax + 50) }).titleHint,
    ).toHaveLength(LINK_LIMIT.TitleMax);
  });
});
