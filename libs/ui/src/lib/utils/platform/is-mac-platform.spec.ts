import { describe, expect, it } from 'vitest';
import { isMacPlatform } from './is-mac-platform';

const nav = (platform: string, hinted?: string): Navigator =>
  ({
    platform,
    userAgentData: hinted === undefined ? undefined : { platform: hinted },
  }) as unknown as Navigator;

describe('isMacPlatform', () => {
  it('reads userAgentData.platform first', () => {
    expect(isMacPlatform(nav('Win32', 'macOS'))).toBe(true);
    expect(isMacPlatform(nav('MacIntel', 'Windows'))).toBe(false);
  });

  it('falls back to navigator.platform', () => {
    expect(isMacPlatform(nav('MacIntel'))).toBe(true);
    expect(isMacPlatform(nav('iPhone'))).toBe(true);
    expect(isMacPlatform(nav('iPad'))).toBe(true);
    expect(isMacPlatform(nav('Win32'))).toBe(false);
    expect(isMacPlatform(nav('Linux x86_64'))).toBe(false);
    expect(isMacPlatform(nav('Win32', ''))).toBe(false);
  });

  it('is false without a navigator', () => {
    expect(isMacPlatform(undefined)).toBe(false);
  });
});
