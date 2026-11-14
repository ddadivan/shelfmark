import { MAC_PLATFORM } from './models/mac-platform.const';
import type { ToastShortcutKey } from '../../components/toast/models/toast-shortcut-key.interface';

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

/**
 * The same shortcut as key caps: option and shift signs on macOS (drawn as icons, so they are
 * centred on every OS), the words Alt and Shift elsewhere.
 */
export function toastShortcutKeys(mac: boolean = isMacPlatform()): readonly ToastShortcutKey[] {
  return [
    mac ? { label: 'Option', icon: 'key-option' } : { label: 'Alt' },
    mac ? { label: 'Shift', icon: 'key-shift' } : { label: 'Shift' },
    { label: 'T' },
  ];
}
