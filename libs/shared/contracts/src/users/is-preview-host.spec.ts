import { describe, expect, it } from 'vitest';
import { isPreviewHost } from './is-preview-host';

describe('isPreviewHost', () => {
  it.each(['github.com', 'www.linkedin.com', 'xn--80ak6aa92e.com', 'a-b.co.uk'])(
    'accepts %s',
    (host) => {
      expect(isPreviewHost(host)).toBe(true);
    },
  );

  it.each([
    'localhost',
    'GitHub.com',
    'github.com.',
    'https://github.com',
    'github.com/path',
    'github.com:443',
    '-bad.com',
    'bad-.com',
    `${'a'.repeat(64)}.com`,
    `${'a.'.repeat(130)}com`,
    '',
    42,
    null,
  ])('rejects %s', (host) => {
    expect(isPreviewHost(host)).toBe(false);
  });
});
