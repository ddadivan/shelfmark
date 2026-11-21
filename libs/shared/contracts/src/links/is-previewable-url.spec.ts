import { describe, expect, it } from 'vitest';
import { isPreviewableUrl } from './is-previewable-url';

describe('isPreviewableUrl', () => {
  it('accepts https addresses', () => {
    expect(isPreviewableUrl('https://angular.dev/guide/zoneless')).toBe(true);
  });

  it.each([
    'http://example.com',
    'https://user:pw@example.com',
    'javascript:alert(1)',
    'data:text/html,hi',
    'about:blank',
    'nope',
  ])('rejects %s', (url) => {
    expect(isPreviewableUrl(url)).toBe(false);
  });
});
