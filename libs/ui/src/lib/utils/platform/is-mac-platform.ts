import { MAC_PLATFORM } from './models/mac-platform.const';

/**
 * True on Apple devices (macOS, iPadOS, iOS), where the command key is Cmd and Alt is called
 * Option. Reads `navigator.userAgentData.platform` where the browser has it, else
 * `navigator.platform`; false without a `navigator` (tests, server rendering).
 */
export function isMacPlatform(nav: Navigator | undefined = globalThis.navigator): boolean {
  if (!nav) {
    return false;
  }
  const hinted = (nav as Navigator & { userAgentData?: { platform?: string } }).userAgentData
    ?.platform;
  return MAC_PLATFORM.test(hinted || nav.platform || '');
}
