/** Whether the device uses Cmd (macOS, iOS) rather than Ctrl as its command key. */
export function isMacPlatform(): boolean {
  return /mac|iphone|ipad|ipod/i.test(globalThis.navigator?.userAgent ?? '');
}
