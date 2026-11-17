/**
 * `userAgentData` brands of the browsers that install the extension from the Chrome Web Store.
 * Arc (and other plain Chromium shells such as Vivaldi) report only `Chromium` next to the
 * GREASE brand, so `Chromium` alone counts too.
 */
export const EXTENSION_BROWSER_BRAND = {
  Chrome: 'Google Chrome',
  Edge: 'Microsoft Edge',
  Brave: 'Brave',
  Chromium: 'Chromium',
} as const;
