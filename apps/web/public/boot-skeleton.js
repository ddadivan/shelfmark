// First paint of a signed-in start (#410). An external script, so the strict CSP stays: it only
// decides whether the app skeleton of index.html shows (`html[data-boot-skeleton]`, styles in
// src/_boot-skeleton.scss) and, for a fixed light or dark preference, which theme it wears. The
// app (ThemeService, AuthStore) takes over and removes the skeleton once a page is rendered.
(function () {
  const HINT_KEY = 'sm-session-hint'; // STORAGE_KEY.SessionHint
  const DEMO_HINT = 'demo'; // SESSION_HINT_KIND.Demo: the hint of a demo session (#440)
  const THEME_KEY = 'sm-theme'; // STORAGE_KEY.Theme
  const MAX_MS = 15000; // never leave an overlay over a page that failed to start
  // The library's extension banner (#455, #490), held in the skeleton when the app will show it.
  const EXTENSION_DISMISSED_KEY = 'sm-extension-banner-dismissed'; // STORAGE_KEY.ExtensionBannerDismissed
  const EXTENSION_BRANDS = ['Google Chrome', 'Microsoft Edge', 'Brave', 'Chromium']; // EXTENSION_BROWSER_BRAND
  const OTHER_BRANDS = ['Opera', 'Opera GX', 'Samsung Internet']; // OTHER_CHROMIUM_BRAND
  const DESKTOP_QUERY = '(width >= 64em)'; // ViewportService.desktop
  const WIDE_QUERY = '(width >= 80em)'; // ViewportService.wide: the split view opens from here
  const root = document.documentElement;
  const path = location.pathname.replace(/(.)\/$/, '$1');
  // Pages a guest can be on: the hint (a session that may have ended) is not trusted there.
  const guestPage = /^\/(sign-in|about|privacy|changelog|share|help(\/.*)?|c\/.*)$/.test(path);
  let show = path === '/demo';
  // The demo start and a stored demo session have the demo banner above the shell (#440).
  let demo = show;
  let theme = null;
  try {
    const hint = localStorage.getItem(HINT_KEY);
    show = show || (!guestPage && hint !== null);
    demo = demo || (!guestPage && hint === DEMO_HINT);
    theme = localStorage.getItem(THEME_KEY);
  } catch {
    // Storage blocked: no hint, no skeleton.
  }
  if (!show) {
    const unused = document.querySelector('[data-app-skeleton]');
    if (unused) unused.remove();
    return;
  }
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  if (demo) root.setAttribute('data-boot-demo', '');
  // The main area of the page the address leads to (styles in src/_boot-skeleton.scss); every other
  // address keeps the library's.
  const page = bootPage();
  if (page) root.setAttribute('data-boot-page', page);
  if (extensionBanner()) root.setAttribute('data-boot-extension', '');
  if (extensionRow()) root.setAttribute('data-boot-extension-row', '');
  root.setAttribute('data-boot-skeleton', '');
  setTimeout(function () {
    const left = document.querySelector('[data-app-skeleton]');
    if (left) left.remove();
  }, MAX_MS);

  /** The page variant of the skeleton's main area, or null for the library (`APP_PATH`). */
  function bootPage() {
    if (path === '/today') return 'today';
    if (path === '/recent') return 'recent';
    if (path === '/trash') return 'trash';
    if (path === '/reminders') return 'reminders';
    if (path === '/revisit') return 'revisit';
    if (path === '/tags') return 'tags';
    if (path === '/import') return 'import';
    if (path === '/ask') return 'ask';
    if (path === '/unsorted/tidy') return 'tidy';
    // `/library` is the phone's Library tab; a desktop window is sent on to the feed.
    if (path === '/library') return matchMedia(DESKTOP_QUERY).matches ? null : 'library-tab';
    if (/^\/settings(\/.*)?$/.test(path)) return 'settings';
    if (/^\/admin(\/.*)?$/.test(path)) return 'reminders';
    return null;
  }

  /**
   * As `BrowserExtensionService.offered` and `ExtensionBannerService.bannerShown`: a library page
   * (`/` and `/demo` lead there), a desktop-wide window without the split view, a browser that
   * installs from the Chrome Web Store (`isExtensionBrowser`), and the banner not closed.
   */
  function extensionBanner() {
    const libraryPage = /^\/(|demo|links|unsorted|favorites|folders\/[^/]+)$/.test(path);
    if (!libraryPage || !matchMedia(DESKTOP_QUERY).matches) return false;
    if (new URLSearchParams(location.search).has('split') && matchMedia(WIDE_QUERY).matches) {
      return false;
    }
    try {
      if (localStorage.getItem(EXTENSION_DISMISSED_KEY) === '1') return false;
    } catch {
      return false;
    }
    return extensionBrowser();
  }

  /**
   * As `ExtensionBannerService.entryShown`: the "Get the extension" row of the sidebar footer takes
   * the banner's place once it is closed (same browser and desktop window, any page).
   */
  function extensionRow() {
    return matchMedia(DESKTOP_QUERY).matches && extensionBrowser() && extensionBannerClosed();
  }

  function extensionBannerClosed() {
    try {
      return localStorage.getItem(EXTENSION_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  }

  /** As `isExtensionBrowser`. */
  function extensionBrowser() {
    const data = navigator.userAgentData;
    if (data && data.brands && data.brands.length > 0) {
      if (data.mobile || data.platform === 'Android') return false;
      const names = data.brands.map(function (entry) {
        return entry.brand;
      });
      const other = names.some(function (name) {
        return OTHER_BRANDS.indexOf(name) !== -1;
      });
      const supported = names.some(function (name) {
        return EXTENSION_BRANDS.indexOf(name) !== -1;
      });
      return !other && supported;
    }
    const agent = navigator.userAgent;
    return (
      /\b(?:Chrome|Edg)\/\d+/.test(agent) &&
      !/Android|Mobile|CriOS|EdgiOS|OPR\/|SamsungBrowser/.test(agent)
    );
  }
})();
