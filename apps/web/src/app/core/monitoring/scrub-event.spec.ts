import type { ErrorEvent } from '@sentry/browser';
import { scrubEvent } from './scrub-event';
import { scrubText } from './scrub-text';

describe('scrubText', () => {
  it('removes URLs, emails and auth tokens', () => {
    expect(
      scrubText('Failed https://example.com/a?t=1 for ada@example.com with Bearer abc.d-1'),
    ).toBe('Failed [url] for [email] with Bearer [redacted]');
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
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Load https://private.example/x failed for ada@example.com',
            mechanism: { type: 'generic', handled: false, data: { url: 'https://x.test' } },
            stacktrace: {
              frames: [{ filename: 'https://shelfmark.app/main-ABC.js?v=1#x', lineno: 1 }, {}],
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

  it('removes link URLs and emails from every text field', () => {
    const event = scrubEvent(sample());
    expect(JSON.stringify(event)).not.toMatch(
      /example\.com|private\.example|x\.test|secret|session|\?v=1/,
    );
    expect(event.exception?.values?.[0]?.value).toBe('Load [url] failed for [email]');
    expect(event.exception?.values?.[0]?.mechanism?.data).toBeUndefined();
    expect(event.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename).toBe(
      'https://shelfmark.app/main-ABC.js',
    );
    expect(event.logentry?.message).toBe('see [url]');
  });

  it('handles an event without optional parts and a request without url', () => {
    expect(scrubEvent({ type: undefined })).toEqual({ type: undefined });
    expect(
      scrubEvent({ type: undefined, request: { cookies: { a: 'b' } } }).request,
    ).toBeUndefined();
  });
});
