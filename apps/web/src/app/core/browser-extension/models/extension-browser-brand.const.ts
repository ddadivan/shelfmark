/**
 * `userAgentData` brands of the browsers that install the extension from the Chrome Web Store.
 * Arc reports only `Chromium` next to the GREASE brand, so `Chromium` alone counts too. That also
 * lets in other Chromium builds that report it (Vivaldi, Yandex, DuckDuckGo): they install from
 * the store as well. Opera and Samsung Internet are excluded by `OTHER_CHROMIUM_BRAND`.
 */
export const EXTENSION_BROWSER_BRAND = {
  Chrome: 'Google Chrome',
  Edge: 'Microsoft Edge',
  Brave: 'Brave',
  Chromium: 'Chromium',
} as const;
