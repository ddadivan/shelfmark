import { compareVersions } from './compare-versions';

describe('compareVersions', () => {
  it('orders by major, minor and patch as numbers', () => {
    expect(compareVersions('2.0.10', '2.0.9')).toBeGreaterThan(0);
    expect(compareVersions('2.1.0', '2.0.5')).toBeGreaterThan(0);
    expect(compareVersions('1.9.9', '2.0.0')).toBeLessThan(0);
    expect(compareVersions('2.0.5', '2.0.5')).toBe(0);
  });

  it('puts a pre-release before its release', () => {
    expect(compareVersions('2.1.0-dev', '2.1.0')).toBeLessThan(0);
    expect(compareVersions('2.1.0', '2.1.0-dev')).toBeGreaterThan(0);
    expect(compareVersions('2.1.0-dev', '2.0.5')).toBeGreaterThan(0);
    expect(compareVersions('2.1.0-alpha', '2.1.0-beta')).toBeLessThan(0);
    expect(compareVersions('2.1.0-dev', '2.1.0-dev')).toBe(0);
  });

  it('treats an unreadable version as the oldest', () => {
    expect(compareVersions('garbage', '0.0.1')).toBeLessThan(0);
    expect(compareVersions('0.0.1', 'v1')).toBeGreaterThan(0);
    expect(compareVersions('x', 'y')).toBe(0);
  });
});
