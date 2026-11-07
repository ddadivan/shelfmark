import type { ErrorEvent } from '@sentry/node';
import { scrubEvent } from './scrub-event';
import { scrubText } from './scrub-text';

describe('scrubText', () => {
  it('removes URLs, emails and auth tokens', () => {
    const text = scrubText(
      'Failed https://example.com/a?token=1 for ada@example.com with Bearer abc.def-1',
    );
    expect(text).toBe('Failed [url] for [email] with Bearer [redacted]');
  });
});

describe('scrubEvent', () => {
  function sample(): ErrorEvent {
    return {
      type: undefined,
      message: 'Cannot fetch http://intranet.local/page for bob@example.com',
      transaction: 'GET /api/links',
      server_name: 'host-1',
      request: {
        url: 'https://shelfmark.app/api/links?q=secret',
        query_string: 'q=secret',
        cookies: { sid: 'session' },
        headers: { cookie: 'sid=session', authorization: 'Bearer t' },
        data: { url: 'https://private.example' },
      },
      user: { email: 'bob@example.com', ip_address: '1.2.3.4', id: '1' },
      breadcrumbs: [{ message: 'fetch https://private.example' }],
      extra: { body: 'secret' },
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Request to https://private.example/x failed for ada@example.com',
            mechanism: { type: 'generic', handled: false, data: { url: 'https://x.test' } },
          },
        ],
      },
      logentry: { message: 'see https://private.example' },
      tags: { requestId: 'rid-1' },
    };
  }

  it('drops request, user, breadcrumbs, extra and server name', () => {
    const event = scrubEvent(sample());
    expect(event.request).toBeUndefined();
    expect(event.user).toBeUndefined();
    expect(event.breadcrumbs).toBeUndefined();
    expect(event.extra).toBeUndefined();
    expect(event.server_name).toBeUndefined();
  });

  it('keeps the request id tag and scrubs free text', () => {
    const event = scrubEvent(sample());
    const dump = JSON.stringify(event);
    expect(event.tags).toEqual({ requestId: 'rid-1' });
    expect(dump).not.toMatch(/example\.com|private\.example|intranet|x\.test|secret|session/);
    expect(event.exception?.values?.[0]?.value).toBe('Request to [url] failed for [email]');
    expect(event.exception?.values?.[0]?.mechanism?.data).toBeUndefined();
    expect(event.logentry?.message).toBe('see [url]');
  });

  it('handles an event without optional parts', () => {
    expect(scrubEvent({ type: undefined })).toEqual({ type: undefined });
  });
});
