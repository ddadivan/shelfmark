import { scrubText } from './scrub-text';

// Identical in apps/api/src/monitoring and apps/web/src/app/core/monitoring: a drift guard for the
// two copies of scrubText (ADR 0032). Change both files together.
const CASES: readonly (readonly [label: string, input: string, expected: string])[] = [
  ['scheme URL', 'open https://example.com/a?t=1 now', 'open [url] now'],
  ['non-http scheme URL', 'open ftp://files.example.net/x', 'open [url]'],
  ['email', 'mail ada@example.com now', 'mail [email] now'],
  ['bearer token', 'sent Bearer abc.def-1', 'sent Bearer [redacted]'],
  ['basic token', 'sent Basic dXNlcjpwYXNz', 'sent Basic [redacted]'],
  ['www host', 'saved www.mysite.xyz failed', 'saved [url] failed'],
  ['strong tld host', 'saved example.org failed', 'saved [url] failed'],
  ['strong tld host with path and query', 'saved example.org/p/q?x=1 failed', 'saved [url] failed'],
  ['subdomain host with port', 'connect api.intranet.local:8080/admin', 'connect [url]'],
  ['short tld host with path', 'saved mysite.io/private/page', 'saved [url]'],
  ['short tld host with port', 'saved mysite.dev:3000', 'saved [url]'],
  ['ipv4', 'connect 10.0.0.5 failed', 'connect [url] failed'],
  ['ipv4 with port and path', 'connect 10.0.0.5:3000/x', 'connect [url]'],
  ['property access foo.to', 'reading foo.to failed', 'reading foo.to failed'],
  ['property access state.no', 'state.no is not a function', 'state.no is not a function'],
  ['property access x.it', 'x.it is undefined', 'x.it is undefined'],
  ['Object.is', 'Object.is is not a function', 'Object.is is not a function'],
  ['optional chaining x.it?.y', 'x.it?.y is undefined', 'x.it?.y is undefined'],
  ['file name app.component.ts', 'at app.component.ts:10:5', 'at app.component.ts:10:5'],
  ['service name links.service', 'TypeError in links.service', 'TypeError in links.service'],
  ['version number', 'version 1.2.3 loaded', 'version 1.2.3 loaded'],
  ['plain text', 'Server error', 'Server error'],
];

describe('scrubText', () => {
  it.each(CASES)('%s', (_label, input, expected) => {
    expect(scrubText(input)).toBe(expected);
  });
});
