import { describe, expect, it } from 'vitest';
import { framableUrl, isFramableUrl } from './framable-url';

describe('isFramableUrl', () => {
  it('accepts absolute https URLs', () => {
    expect(isFramableUrl('https://example.com')).toBe(true);
    expect(isFramableUrl('https://www.example.com:8443/a/b?c=1#d')).toBe(true);
  });

  it.each([
    'http://example.com',
    'javascript:alert(1)',
    'data:text/html,<p>x</p>',
    'blob:https://example.com/1234',
    'about:blank',
    'file:///etc/passwd',
    'ftp://example.com',
    '//example.com',
    '/relative/path',
    'example.com',
    'https://user@example.com',
    'https://user:pass@example.com',
    'https://:pass@example.com',
    'https://',
    '',
    '   ',
    'not a url',
  ])('rejects %j', (value) => {
    expect(isFramableUrl(value)).toBe(false);
  });

  it('rejects the app origin', () => {
    expect(isFramableUrl('https://app.example/x', 'https://app.example')).toBe(false);
    expect(isFramableUrl('https://other.example/x', 'https://app.example')).toBe(true);
  });
});

describe('framableUrl', () => {
  it('returns the normalised href or null', () => {
    expect(framableUrl('HTTPS://Example.com')).toBe('https://example.com/');
    expect(framableUrl('http://example.com')).toBeNull();
  });
});
