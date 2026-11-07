import { clientIp } from './client-ip';
import { createRateLimitOptions, shouldTrustProxyHeaders } from './rate-limit-options';

function req(headers: Record<string, unknown>, ip?: string): unknown {
  return { headers, ip };
}

describe('clientIp', () => {
  it('prefers x-vercel-forwarded-for over x-forwarded-for and the socket', () => {
    const request = req(
      { 'x-vercel-forwarded-for': '203.0.113.7', 'x-forwarded-for': '198.51.100.1' },
      '10.0.0.1',
    );
    expect(clientIp(request, true)).toBe('203.0.113.7');
  });

  it('falls back to the first hop of x-forwarded-for', () => {
    expect(clientIp(req({ 'x-forwarded-for': '198.51.100.1, 10.0.0.2' }, '10.0.0.1'), true)).toBe(
      '198.51.100.1',
    );
  });

  it('ignores invalid header values and uses the socket address', () => {
    expect(clientIp(req({ 'x-vercel-forwarded-for': 'not-an-ip' }, '192.0.2.9'), true)).toBe(
      '192.0.2.9',
    );
  });

  it('ignores forwarded headers when they are not trusted', () => {
    const request = req({ 'x-vercel-forwarded-for': '203.0.113.7' }, '192.0.2.9');
    expect(clientIp(request, false)).toBe('192.0.2.9');
  });

  it('groups IPv6 addresses by their /64', () => {
    const a = clientIp(req({}, '2001:db8:1:2:aaaa::1'), false);
    const b = clientIp(req({}, '2001:db8:1:2:bbbb::2'), false);
    expect(a).toBe(b);
  });

  it.each([undefined, null, 'x', {}, { headers: 5 }])(
    'survives a malformed request %j',
    (value) => {
      expect(clientIp(value, true)).toBe('unknown');
    },
  );
});

describe('shouldTrustProxyHeaders', () => {
  it('trusts the headers on Vercel and outside production only', () => {
    expect(shouldTrustProxyHeaders(true, { VERCEL: '1' })).toBe(true);
    expect(shouldTrustProxyHeaders(false, {})).toBe(true);
    expect(shouldTrustProxyHeaders(true, {})).toBe(false);
  });
});

describe('createRateLimitOptions', () => {
  it('builds a per-IP tracker', () => {
    const options = createRateLimitOptions(true);
    if (Array.isArray(options) || !options.getTracker) throw new Error('unexpected options');
    const context = {} as never;
    expect(
      options.getTracker(req({ 'x-vercel-forwarded-for': '203.0.113.7' }) as never, context),
    ).toBe('203.0.113.7');
  });
});
