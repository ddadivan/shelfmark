import { normalizeRuleDomain, ruleHost } from './normalize-rule-domain';

describe('normalizeRuleDomain', () => {
  it('keeps a plain domain in lower case', () => {
    expect(normalizeRuleDomain('youtube.com')).toBe('youtube.com');
    expect(normalizeRuleDomain('  YouTube.COM ')).toBe('youtube.com');
  });

  it('drops www., one trailing dot, the scheme, the port, the path and the query', () => {
    expect(normalizeRuleDomain('www.youtube.com')).toBe('youtube.com');
    expect(normalizeRuleDomain('youtube.com.')).toBe('youtube.com');
    expect(normalizeRuleDomain('https://WWW.youtube.com/watch?v=1#t')).toBe('youtube.com');
    expect(normalizeRuleDomain('http://m.youtube.com:8080/x')).toBe('m.youtube.com');
  });

  it('keeps subdomains other than www', () => {
    expect(normalizeRuleDomain('music.youtube.com')).toBe('music.youtube.com');
    expect(normalizeRuleDomain('www2.example.co.uk')).toBe('www2.example.co.uk');
  });

  it('stores an international domain in punycode', () => {
    expect(normalizeRuleDomain('bücher.de')).toBe('xn--bcher-kva.de');
    expect(normalizeRuleDomain('xn--bcher-kva.de')).toBe('xn--bcher-kva.de');
    expect(normalizeRuleDomain('пример.рф')).toBe('xn--e1afmkfd.xn--p1ai');
  });

  it('refuses what is not a domain name', () => {
    for (const input of [
      '',
      '   ',
      'localhost',
      'youtube',
      '127.0.0.1',
      '[::1]',
      'javascript:alert(1)',
      'mailto:a@example.com',
      'ftp://example.com',
      'two words.com',
      'www.com',
      `${'a'.repeat(250)}.com`,
      'x'.repeat(3000),
    ]) {
      expect(normalizeRuleDomain(input), input).toBeNull();
    }
  });
});

describe('ruleHost', () => {
  it('reads the host of http(s) URLs only', () => {
    expect(ruleHost('https://www.YouTube.com/watch')).toBe('youtube.com');
    expect(ruleHost('http://bücher.de/')).toBe('xn--bcher-kva.de');
    expect(ruleHost('ftp://example.com')).toBeNull();
    expect(ruleHost('not a url')).toBeNull();
  });
});
