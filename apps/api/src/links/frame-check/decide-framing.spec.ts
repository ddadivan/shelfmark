import { LINK_FRAMING } from '@shelfmark/contracts';
import { decideFraming } from './decide-framing';

const headers = (xFrameOptions: string | null, contentSecurityPolicy: string | null = null) => ({
  xFrameOptions,
  contentSecurityPolicy,
});

describe('decideFraming', () => {
  it('allows a page with no framing headers', () => {
    expect(decideFraming(headers(null))).toBe(LINK_FRAMING.Allowed);
  });

  it.each([
    'DENY',
    'deny',
    ' SameOrigin ',
    'SAMEORIGIN',
    'ALLOW-FROM https://a.example',
    'allow-from https://a.example',
    'DENY, SAMEORIGIN',
    'ALLOWALL, DENY',
  ])('blocks X-Frame-Options %j', (value) => {
    expect(decideFraming(headers(value))).toBe(LINK_FRAMING.Blocked);
  });

  it.each(['ALLOWALL', '', 'unknown'])('does not block on X-Frame-Options %j alone', (value) => {
    expect(decideFraming(headers(value))).toBe(LINK_FRAMING.Allowed);
  });

  it.each([
    "frame-ancestors 'none'",
    "frame-ancestors 'self'",
    'FRAME-ANCESTORS',
    'frame-ancestors',
    'frame-ancestors https://a.example https://*.b.example',
    'frame-ancestors http:',
    'frame-ancestors data:',
    "default-src 'self'; frame-ancestors 'self'; img-src *",
    "default-src 'self', frame-ancestors 'none'",
    'frame-ancestors *, frame-ancestors https://only.example',
    // Only the first frame-ancestors of a policy counts.
    'frame-ancestors https://x.example; frame-ancestors *',
  ])('blocks CSP %j', (value) => {
    expect(decideFraming(headers(null, value))).toBe(LINK_FRAMING.Blocked);
  });

  it.each([
    'frame-ancestors *',
    'frame-ancestors https:',
    'frame-ancestors HTTPS://*',
    "frame-ancestors 'self' https:",
    "default-src 'self'; img-src *",
    "default-src 'self'",
    '',
    "script-src 'none'; frame-src 'none'",
  ])('allows CSP %j', (value) => {
    expect(decideFraming(headers(null, value))).toBe(LINK_FRAMING.Allowed);
  });

  it('blocks when either header refuses', () => {
    expect(decideFraming(headers('DENY', 'frame-ancestors *'))).toBe(LINK_FRAMING.Blocked);
    expect(decideFraming(headers('ALLOWALL', "frame-ancestors 'none'"))).toBe(LINK_FRAMING.Blocked);
  });
});
