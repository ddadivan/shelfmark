import { toAuthSessionResponse } from './to-auth-session-response';

const expiresAt = new Date('2030-01-01T00:00:00.000Z');
const user = {
  id: 'u1',
  name: 'Ada',
  email: 'ada@example.test',
  image: null,
  isDemo: false,
  demoExpiresAt: null,
  onboardingCompletedAt: null,
};

describe('toAuthSessionResponse', () => {
  it('maps to exactly the contract and drops token, IP address and user agent', () => {
    const result = toAuthSessionResponse({
      user: { ...user, emailVerified: true, createdAt: new Date() },
      session: {
        id: 's1',
        token: 'secret-token',
        ipAddress: '10.0.0.1',
        userAgent: 'agent',
        userId: 'u1',
        expiresAt,
      },
    });
    expect(result).toEqual({ user, session: { expiresAt: '2030-01-01T00:00:00.000Z' } });
    expect(JSON.stringify(result)).not.toMatch(/secret-token|10\.0\.0\.1|agent/);
  });

  it('accepts an ISO string expiry and keeps a string image', () => {
    const result = toAuthSessionResponse({
      user: { ...user, image: 'https://img.example.test/a.png', isDemo: true },
      session: { expiresAt: '2030-01-01T00:00:00Z' },
    });
    expect(result?.user.image).toBe('https://img.example.test/a.png');
    expect(result?.user.isDemo).toBe(true);
    expect(result?.session.expiresAt).toBe('2030-01-01T00:00:00.000Z');
  });

  it('maps the demo expiry for a demo user only', () => {
    const expiry = new Date('2030-01-02T00:00:00.000Z');
    const demo = toAuthSessionResponse({
      user: { ...user, isDemo: true, demoExpiresAt: expiry },
      session: { expiresAt },
    });
    expect(demo?.user.demoExpiresAt).toBe('2030-01-02T00:00:00.000Z');
    const regular = toAuthSessionResponse({
      user: { ...user, demoExpiresAt: expiry },
      session: { expiresAt },
    });
    expect(regular?.user.demoExpiresAt).toBeNull();
    const missing = toAuthSessionResponse({
      user: { ...user, isDemo: true },
      session: { expiresAt },
    });
    expect(missing?.user.demoExpiresAt).toBeNull();
  });

  it('treats a non-boolean isDemo as false and a non-string image as null', () => {
    const result = toAuthSessionResponse({
      user: { ...user, isDemo: 'yes', image: 5 },
      session: { expiresAt },
    });
    expect(result?.user).toMatchObject({ isDemo: false, image: null });
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'x'],
    ['no session', { user }],
    ['no user', { session: { expiresAt } }],
    ['bad id', { user: { ...user, id: 1 }, session: { expiresAt } }],
    ['bad name', { user: { ...user, name: undefined }, session: { expiresAt } }],
    ['bad email', { user: { ...user, email: null }, session: { expiresAt } }],
    ['bad expiry', { user, session: { expiresAt: 'not a date' } }],
    ['missing expiry', { user, session: {} }],
  ])('fails closed to null for %s', (_label, value) => {
    expect(toAuthSessionResponse(value)).toBeNull();
  });
});
