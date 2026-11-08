import { NODE_ENV } from './config/models/node-env.const';

describe('vitest setup', () => {
  it('runs specs outside Better Auth test mode (no NODE_ENV=test, no TEST)', () => {
    expect(process.env['TEST']).toBeUndefined();
    expect(process.env['NODE_ENV']).not.toBe(NODE_ENV.Test);
    expect(process.env['NODE_ENV']).toBe(NODE_ENV.Development);
  });

  it('provides a random auth secret and a loopback database URL', () => {
    expect(process.env['BETTER_AUTH_SECRET']).toMatch(/^[0-9a-f]{64}$/);
    expect(process.env['DATABASE_URL']).toContain('127.0.0.1');
  });
});
