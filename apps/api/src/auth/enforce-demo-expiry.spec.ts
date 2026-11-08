import type { AuthSessionResponse } from '@shelfmark/contracts';
import { enforceDemoExpiry } from './enforce-demo-expiry';

const NOW = new Date('2030-01-01T12:00:00.000Z');

function auth(user: Partial<AuthSessionResponse['user']>, expiresAt: string): AuthSessionResponse {
  return {
    user: {
      id: 'u1',
      name: 'N',
      email: 'n@example.test',
      image: null,
      isDemo: false,
      demoExpiresAt: null,
      ...user,
    },
    session: { expiresAt },
  };
}

describe('enforceDemoExpiry', () => {
  it('passes null and regular users through unchanged', () => {
    expect(enforceDemoExpiry(null, NOW)).toBeNull();
    const regular = auth({}, '2030-01-08T00:00:00.000Z');
    expect(enforceDemoExpiry(regular, NOW)).toBe(regular);
  });

  it('signs out an expired demo user, also exactly at the expiry', () => {
    const past = auth(
      { isDemo: true, demoExpiresAt: '2030-01-01T11:00:00.000Z' },
      '2030-01-08T00:00:00.000Z',
    );
    expect(enforceDemoExpiry(past, NOW)).toBeNull();
    const exact = auth(
      { isDemo: true, demoExpiresAt: NOW.toISOString() },
      '2030-01-08T00:00:00.000Z',
    );
    expect(enforceDemoExpiry(exact, NOW)).toBeNull();
  });

  it('fails closed for a demo user without an expiry', () => {
    expect(enforceDemoExpiry(auth({ isDemo: true }, '2030-01-08T00:00:00.000Z'), NOW)).toBeNull();
  });

  it('caps the session expiry at the demo expiry', () => {
    const live = auth(
      { isDemo: true, demoExpiresAt: '2030-01-02T00:00:00.000Z' },
      '2030-01-08T00:00:00.000Z',
    );
    expect(enforceDemoExpiry(live, NOW)?.session.expiresAt).toBe('2030-01-02T00:00:00.000Z');
  });

  it('keeps a session that already ends before the demo expiry', () => {
    const live = auth(
      { isDemo: true, demoExpiresAt: '2030-01-02T00:00:00.000Z' },
      '2030-01-01T18:00:00.000Z',
    );
    expect(enforceDemoExpiry(live, NOW)).toBe(live);
  });

  it('uses the current time by default', () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    expect(enforceDemoExpiry(auth({ isDemo: true, demoExpiresAt: future }, future))).not.toBeNull();
  });
});
