import { isHttpUrl } from './is-http-url';
import { withDefaultScheme } from './with-default-scheme';

describe('withDefaultScheme', () => {
  it.each([
    ['example.com', 'https://example.com'],
    ['www.example.com', 'https://www.example.com'],
    ['example.com/path?x=1', 'https://example.com/path?x=1'],
    ['example.com/path#part', 'https://example.com/path#part'],
    ['sub.example.co.uk', 'https://sub.example.co.uk'],
    ['Example.COM/Docs', 'https://Example.COM/Docs'],
    ['example.com.', 'https://example.com.'],
    ['my_site.example.com', 'https://my_site.example.com'],
  ])('adds https:// to the bare host %s', (input, expected) => {
    expect(withDefaultScheme(input)).toBe(expected);
    expect(isHttpUrl(withDefaultScheme(input))).toBe(true);
  });

  it('keeps ports', () => {
    expect(withDefaultScheme('example.com:8080')).toBe('https://example.com:8080');
    expect(withDefaultScheme('example.com:8080/a?b=1')).toBe('https://example.com:8080/a?b=1');
    expect(withDefaultScheme('localhost:3000')).toBe('https://localhost:3000');
  });

  it('accepts IDN hosts in Unicode and punycode', () => {
    expect(withDefaultScheme('bücher.de')).toBe('https://bücher.de');
    expect(withDefaultScheme('пример.рф/путь')).toBe('https://пример.рф/путь');
    expect(withDefaultScheme('xn--e1afmkfd.xn--p1ai')).toBe('https://xn--e1afmkfd.xn--p1ai');
    expect(new URL(withDefaultScheme('bücher.de')).hostname).toBe('xn--bcher-kva.de');
  });

  it('treats localhost and IP addresses like other hosts (the SSRF guard decides later)', () => {
    expect(withDefaultScheme('localhost')).toBe('https://localhost');
    expect(withDefaultScheme('127.0.0.1')).toBe('https://127.0.0.1');
    expect(withDefaultScheme('192.168.0.1:8080/admin')).toBe('https://192.168.0.1:8080/admin');
    expect(withDefaultScheme('[::1]')).toBe('https://[::1]');
    expect(withDefaultScheme('[::1]:8080')).toBe('https://[::1]:8080');
  });

  it('completes a scheme-relative address', () => {
    expect(withDefaultScheme('//example.com/a')).toBe('https://example.com/a');
    expect(withDefaultScheme('//not a host')).toBe('//not a host');
    expect(withDefaultScheme('///etc/passwd')).toBe('///etc/passwd');
  });

  it('keeps http:// and https:// as typed, in any case', () => {
    expect(withDefaultScheme('http://example.com')).toBe('http://example.com');
    expect(withDefaultScheme('https://example.com/a')).toBe('https://example.com/a');
    expect(withDefaultScheme('HTTPS://EXAMPLE.COM')).toBe('HTTPS://EXAMPLE.COM');
    expect(withDefaultScheme('Http://example.com')).toBe('Http://example.com');
    expect(isHttpUrl(withDefaultScheme('HTTPS://EXAMPLE.COM'))).toBe(true);
  });

  it('trims whitespace around the address', () => {
    expect(withDefaultScheme('  example.com \n')).toBe('https://example.com');
    expect(withDefaultScheme('\thttps://example.com ')).toBe('https://example.com');
    expect(withDefaultScheme('   ')).toBe('');
    expect(withDefaultScheme('')).toBe('');
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(document.cookie)',
    'data:text/html,<script>alert(1)</script>',
    'mailto:someone@example.com',
    'ftp://example.com/file',
    'file:///etc/passwd',
    'vbscript:msgbox(1)',
    'tel:+123456789',
  ])('leaves the other scheme %s for validation to reject', (input) => {
    expect(withDefaultScheme(input)).toBe(input);
    expect(isHttpUrl(withDefaultScheme(input))).toBe(false);
  });

  it.each([
    'example',
    'not a link',
    'example .com',
    'example.com/with space',
    'someone@example.com',
    'user:pass@example.com',
    'e.g.',
    'v1.2',
    '.com',
    'example.c',
    '-example.com',
  ])('does not add a scheme to %s, which is not a host', (input) => {
    expect(withDefaultScheme(input)).toBe(input);
  });
});
