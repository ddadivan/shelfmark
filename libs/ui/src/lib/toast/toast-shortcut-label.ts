import { MAC_PLATFORM } from './models/mac-platform.const';

/** True on macOS (and iPadOS), where the Alt key is called Option. */
function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const hinted = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
    ?.platform;
  return MAC_PLATFORM.test(hinted ?? navigator.platform);
}

/**
 * The shortcut as the user reads it on their keys: "Option+Shift+T" on macOS, "Alt+Shift+T"
 * elsewhere. `mac` overrides the detection (tests, server rendering).
 */
export function toastShortcutLabel(mac: boolean = isMacPlatform()): string {
  return `${mac ? 'Option' : 'Alt'}+Shift+T`;
}
