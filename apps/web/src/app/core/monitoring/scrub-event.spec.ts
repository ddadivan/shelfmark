import type { ErrorEvent } from '@sentry/browser';
import { scrubEvent } from './scrub-event';
import { scrubText } from './scrub-text';

describe('scrubText', () => {
  it('removes URLs, emails and auth tokens', () => {
    expect(
      scrubText('Failed https://example.com/a?t=1 for ada@example.com with Bearer abc.d-1'),
    ).toBe('Failed [url] for [email] with Bearer [redacted]');
  });

  it.each([
    [
      'bare host with path and query',
      'saved example.org/private/page?x=1 failed',
      'saved [url] failed',
    ],
    ['www host', 'saved www.mysite.xyz failed', 'saved [url] failed'],
    ['host with port', 'connect intranet.local:8080/admin', 'connect [url]'],
    ['ipv4 with port', 'connect 10.0.0.5:3000/x', 'connect [url]'],
  ])('removes a %s', (_label, input, expected) => {
    expect(scrubText(input)).toBe(expected);
  });

  it('keeps ordinary code identifiers', () => {
    expect(scrubText('TypeError in links.service')).toBe('TypeError in links.service');
  });
});

describe('scrubEvent', () => {
  function sample(): ErrorEvent {
    return {
      type: undefined,
      message: 'Cannot open https://private.example/page for bob@example.com',
      transaction: '/links',
      request: {
        url: 'https://shelfmark.app/links?q=secret#frag',
        query_string: 'q=secret',
        cookies: { sid: 'session' },
        headers: { Cookie: 'sid=session', Referer: 'https://private.example/' },
        data: { url: 'https://private.example' },
      },
      user: { email: 'bob@example.com', ip_address: '1.2.3.4' },
      breadcrumbs: [{ message: 'click https://private.example' }],
      extra: { body: 'secret' },
      contexts: {
        browser: { name: 'Chrome' },
        os: { name: 'macOS' },
        device: { model: 'x' },
        custom: { link: 'https://private.example' },
      },
      tags: { requestId: 'rid-1', page: 'open private.example/page' },
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Load https://private.example/x failed for ada@example.com',
            mechanism: { type: 'generic', handled: false, data: { url: 'https://x.test' } },
            stacktrace: {
              frames: [
                {
                  filename: 'https://shelfmark.app/main-ABC.js?v=1#x',
                  abs_path: 'https://shelfmark.app/main-ABC.js?v=1#x',
                  lineno: 1,
                  context_line: 'open("https://private.example")',
                  pre_context: ['a'],
                  post_context: ['b'],
                  vars: { url: 'https://private.example' },
                },
                {},
              ],
            },
          },
        ],
      },
      logentry: { message: 'see https://private.example' },
    };
  }

  it('drops user, breadcrumbs, extra, cookies, headers and body', () => {
    const event = scrubEvent(sample());
    expect(event.user).toBeUndefined();
    expect(event.breadcrumbs).toBeUndefined();
    expect(event.extra).toBeUndefined();
    expect(event.request).toEqual({ url: 'https://shelfmark.app/links' });
  });

  it('keeps only the allow-listed contexts', () => {
    expect(Object.keys(scrubEvent(sample()).contexts ?? {})).toEqual(['browser', 'os']);
  });

  it('keeps the requestId tag as is and scrubs other tag values', () => {
    expect(scrubEvent(sample()).tags).toEqual({ requestId: 'rid-1', page: 'open [url]' });
  });

  it('removes link URLs and emails from every text field', () => {
    const event = scrubEvent(sample());
    expect(JSON.stringify(event)).not.toMatch(
      /example\.com|private\.example|x\.test|secret|session|\?v=1/,
    );
    expect(event.exception?.values?.[0]?.value).toBe('Load [url] failed for [email]');
    expect(event.exception?.values?.[0]?.mechanism?.data).toBeUndefined();
    expect(event.logentry?.message).toBe('see [url]');
  });

  it('strips query, fragment and source lines from stack frames', () => {
    const [frame] = scrubEvent(sample()).exception?.values?.[0]?.stacktrace?.frames ?? [];
    expect(frame).toEqual({
      filename: 'https://shelfmark.app/main-ABC.js',
      abs_path: 'https://shelfmark.app/main-ABC.js',
      lineno: 1,
    });
  });

  it('handles an event without optional parts and a request without url', () => {
    expect(scrubEvent({ type: undefined })).toEqual({ type: undefined });
    expect(
      scrubEvent({ type: undefined, request: { cookies: { a: 'b' } } }).request,
    ).toBeUndefined();
  });
});
