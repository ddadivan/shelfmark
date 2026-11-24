/** The browser and system of a user agent, for "Chrome on macOS"; `null` parts are unknown. */
export function deviceParts(userAgent: string): { browser: string | null; system: string | null } {
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Firefox\//.test(userAgent)
      ? 'Firefox'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : null;
  const system = /iPhone|iPad|iPod/.test(userAgent)
    ? 'iOS'
    : /Android/.test(userAgent)
      ? 'Android'
      : /Mac OS X|Macintosh/.test(userAgent)
        ? 'macOS'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : null;
  return { browser, system };
}

/** iPhone and iPad allow web notifications only for an app added to the Home Screen. */
export function needsHomeScreen(userAgent: string, standalone: boolean): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) && !standalone;
}
