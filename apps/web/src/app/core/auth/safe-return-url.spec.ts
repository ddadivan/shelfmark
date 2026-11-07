import { safeReturnUrl } from './safe-return-url';

describe('safeReturnUrl', () => {
  it.each(['/', '/links', '/folders/42?tag=a&tag=b', '/share?url=https%3A%2F%2Fa.test%2F#top'])(
    'keeps the app path %s',
    (value) => {
      expect(safeReturnUrl(value)).toBe(value);
    },
  );

  it.each([
    '//evil.test',
    '/\\evil.test',
    '\\\\evil.test',
    'https://evil.test',
    'javascript:alert(1)',
    'links',
    '',
    '/ok\nhttps://evil.test',
    '/a\tb',
    '/a\u0000b',
    '/path\\..\\x',
  ])('rejects %j', (value) => {
    expect(safeReturnUrl(value)).toBeNull();
  });

  it.each([undefined, null, 5, {}, ['/links']])('rejects the non-string %j', (value) => {
    expect(safeReturnUrl(value)).toBeNull();
  });
});
