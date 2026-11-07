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
      contexts: {
        runtime: { name: 'node', version: '26' },
        os: { name: 'Linux' },
        app: { app_memory: 1 },
        trace: { trace_id: 'abc', span_id: 'def' },
        custom: { link: 'https://private.example' },
      },
      tags: {
        requestId: 'rid-1',
        route: 'save private.example/page',
        attempt: 2 as unknown as string,
      },
      exception: {
        values: [
          {
            type: 'PrismaClientKnownRequestError',
            value:
              'Invalid `prisma.link.create()` invocation:\n{ data: { url: "https://private.example/x" } }',
            mechanism: { type: 'generic', handled: false, data: { url: 'https://x.test' } },
            stacktrace: {
              frames: [
                {
                  filename: 'links.service.ts',
                  function: 'create',
                  lineno: 10,
                  abs_path: '/var/task/apps/api/links.service.ts',
                  context_line: 'const url = "https://private.example"',
                  pre_context: ['a'],
                  post_context: ['b'],
                  vars: { url: 'https://private.example' },
                },
              ],
            },
          },
        ],
      },
      logentry: { message: 'see https://private.example' },
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

  it('keeps only the allow-listed contexts', () => {
    expect(Object.keys(scrubEvent(sample()).contexts ?? {})).toEqual(['runtime', 'os']);
  });

  it('keeps the requestId tag as is and scrubs other tag values', () => {
    expect(scrubEvent(sample()).tags).toEqual({
      requestId: 'rid-1',
      route: 'save [url]',
      attempt: 2,
    });
  });

  it('withholds the exception message but keeps type and frame location', () => {
    const [exception] = scrubEvent(sample()).exception?.values ?? [];
    expect(exception?.type).toBe('PrismaClientKnownRequestError');
    expect(exception?.value).toBe('Server error (message withheld)');
    expect(exception?.mechanism?.data).toBeUndefined();
    expect(exception?.stacktrace?.frames?.[0]).toEqual({
      filename: 'links.service.ts',
      function: 'create',
      lineno: 10,
    });
  });

  it('leaves no link, host, email or secret anywhere in the event', () => {
    const dump = JSON.stringify(scrubEvent(sample()));
    expect(dump).not.toMatch(
      /example\.com|private\.example|intranet|x\.test|secret|session|prisma\.link|\/var\/task/,
    );
  });

  it('scrubs the free-text fields', () => {
    const event = scrubEvent(sample());
    expect(event.message).toBe('Cannot fetch [url] for [email]');
    expect(event.logentry?.message).toBe('see [url]');
  });

  it('handles an event without optional parts', () => {
    expect(scrubEvent({ type: undefined })).toEqual({ type: undefined });
  });
});
