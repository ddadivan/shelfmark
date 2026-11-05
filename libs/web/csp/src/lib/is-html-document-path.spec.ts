import { isHtmlDocumentPath } from './is-html-document-path';

describe('isHtmlDocumentPath', () => {
  it.each(['/', '/folders/42', '/folders/42/', '/u/john.doe/links', '/index.html', '/apix'])(
    'is true for %s',
    (path) => {
      expect(isHtmlDocumentPath(path)).toBe(true);
    },
  );

  it.each([
    '/api',
    '/api/',
    '/api/health',
    '/main-ABCD1234.js',
    '/missing.js',
    '/media/x.woff2',
    '/favicon.ico',
    '/assets/ui/icons.svg',
  ])('is false for %s', (path) => {
    expect(isHtmlDocumentPath(path)).toBe(false);
  });
});
