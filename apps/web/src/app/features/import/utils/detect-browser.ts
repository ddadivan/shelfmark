/**
 * The browser of `userAgent` among the help's `known` ids (`chrome`, `edge`, `firefox`, `safari`),
 * for "How to get the file from" (Shelf 09-data: "Chrome detected"); the first known one otherwise.
 * Edge and other Chromium browsers carry "Chrome" too, so Edge is checked first.
 */
export function detectBrowser(userAgent: string, known: readonly string[]): string {
  const found = /Edg\//.test(userAgent)
    ? 'edge'
    : /Firefox\//.test(userAgent)
      ? 'firefox'
      : /Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)
        ? 'chrome'
        : /Safari\//.test(userAgent)
          ? 'safari'
          : null;
  return found !== null && known.includes(found) ? found : (known[0] ?? 'chrome');
}
