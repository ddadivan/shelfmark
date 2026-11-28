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
  // The library's view (`LibraryFilterService.view`, `FeedMemoryService`): the feed's own last choice,
  // else the account's Default view (kept by `LibraryDefaultViewCache`), else masonry.
  const FEED_MEMORY_KEY = 'sm-feed-memory'; // STORAGE_KEY.FeedMemory
  const DEFAULT_VIEW_KEY = 'sm-library-default-view'; // STORAGE_KEY.LibraryDefaultView
  const LIBRARY_VIEWS = ['masonry', 'cards', 'list', 'headlines']; // LIBRARY_VIEW
  const GRID_COLUMNS = [130, 160, 190, 220, 260, 300]; // GRID_COLUMNS (px)
  const GRID_STEP_DEFAULT = 4; // GRID_STEP_DEFAULT
  // The text size, font and density of Settings › Appearance (`ThemeService`, `LAYOUT_ATTRIBUTE`) change
  // every size of the skeleton, so they are copied to `html` as the app will set them.
  const LAYOUT_KEY = 'sm-layout'; // STORAGE_KEY.Layout
  // What the last session saw on library pages, so the placeholder keeps the room of parts that arrive
  // late: "Tidy with suggestions" in Unsorted (`TidyEntryCache`: `1` when it showed) and the subfolder
  // count of a folder (`FolderShapeCache`: JSON of folder id to count).
  const TIDY_KEY = 'sm-tidy-entry'; // STORAGE_KEY.TidyEntry
  const FOLDER_SHAPE_KEY = 'sm-folder-shape'; // STORAGE_KEY.FolderShape
  const root = document.documentElement;
  const path = location.pathname.replace(/(.)\/$/, '$1');
  // Pages a guest can be on: the hint (a session that may have ended) is not trusted there.
  const guestPage = /^\/(sign-in|about|privacy|changelog|help(\/.*)?|c\/.*)$/.test(path);
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
  layout();
  if (demo) root.setAttribute('data-boot-demo', '');
  // The main area of the page the address leads to (styles in src/_boot-skeleton.scss); every other
  // address keeps the library's.
  const page = bootPage();
  if (page) root.setAttribute('data-boot-page', page);
  if (!page) libraryView();
  if (!page) libraryRoom();
  if (page === 'settings') settingsVariant();
  if (extensionBanner()) root.setAttribute('data-boot-extension', '');
  if (extensionRow()) root.setAttribute('data-boot-extension-row', '');
  root.setAttribute('data-boot-skeleton', '');
  setTimeout(function () {
    const left = document.querySelector('[data-app-skeleton]');
    if (left) left.remove();
  }, MAX_MS);

  /** `data-text-size`, `data-font`, `data-density` and `data-card-preview` from the stored layout (the defaults leave them out). */
  function layout() {
    try {
      const stored = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
      if (!stored || typeof stored !== 'object') return;
      if (['s', 'l', 'xl'].indexOf(stored.textSize) !== -1) {
        root.setAttribute('data-text-size', stored.textSize); // TEXT_SIZE
      }
      if (stored.font === 'system' || stored.font === 'readable') {
        root.setAttribute('data-font', stored.font); // APP_FONT
      }
      if (stored.density === 'compact') root.setAttribute('data-density', 'compact'); // DENSITY
      if (stored.cardPreview === 'small' || stored.cardPreview === 'off') {
        root.setAttribute('data-card-preview', stored.cardPreview); // CARD_PREVIEW (large is the default)
      }
    } catch {
      // Storage blocked or broken JSON: the defaults.
    }
  }

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
    // The Web Share Target (`/share?url=`) is signed in only: a guest is sent to sign-in, so the hint holds.
    if (path === '/share') return 'share';
    if (path === '/unsorted/tidy') return 'tidy';
    // `/library` is the phone's Library tab; a desktop window is sent on to the feed.
    if (path === '/library') return matchMedia(DESKTOP_QUERY).matches ? null : 'library-tab';
    if (/^\/settings(\/.*)?$/.test(path)) return 'settings';
    if (/^\/admin(\/.*)?$/.test(path)) return 'reminders';
    return null;
  }

  /**
   * `html[data-boot-settings]` for the settings pages whose real layout differs from the generic title and
   * two panels: Account, Appearance, Library, AI, Notifications and AI › Connect an assistant (their section
   * heights are in src/_boot-skeleton.scss).
   */
  function settingsVariant() {
    const child = /^\/settings\/(account|appearance|library|ai|notifications)$/.exec(path);
    if (child) root.setAttribute('data-boot-settings', child[1]);
    if (path === '/settings/ai/connect') root.setAttribute('data-boot-settings', 'ai-connect');
  }

  /**
   * The feed key of a library path (`LibraryFilterService.feedKey`): the fixed list (`LINKS_SCOPE`)
   * or `folder:<id>`; null when the path is no feed.
   */
  function feedKey() {
    if (path === '/' || path === '/demo' || path === '/links') return 'all';
    if (path === '/unsorted' || path === '/favorites') return path.slice(1);
    const folder = /^\/folders\/([^/]+)$/.exec(path);
    return folder ? 'folder:' + decodeURIComponent(folder[1]) : null;
  }

  /**
   * Sets `html[data-boot-view]` (`grid`, `list` or `headlines`) and, off the default Grid size,
   * `--boot-column` (`data-boot-grid` is the step) for the library placeholder. A side by side
   * preview (`?preview=`, from 80em) shows the feed as a list.
   */
  function libraryView() {
    const key = feedKey();
    if (key === null) return;
    let view = null;
    let step = GRID_STEP_DEFAULT;
    try {
      const memory = JSON.parse(localStorage.getItem(FEED_MEMORY_KEY) || '{}');
      const entry = memory && typeof memory === 'object' ? memory[key] : null;
      if (entry && typeof entry === 'object') {
        if (LIBRARY_VIEWS.indexOf(entry.view) !== -1) view = entry.view;
        if (Number.isInteger(entry.grid) && entry.grid >= 1 && entry.grid <= GRID_COLUMNS.length) {
          step = entry.grid;
        }
      }
      if (view === null) {
        const fallback = localStorage.getItem(DEFAULT_VIEW_KEY);
        view = LIBRARY_VIEWS.indexOf(fallback) !== -1 ? fallback : 'masonry';
      }
    } catch {
      view = 'masonry';
    }
    if (new URLSearchParams(location.search).has('preview') && matchMedia(WIDE_QUERY).matches) {
      view = 'list';
    }
    root.setAttribute('data-boot-view', view === 'list' || view === 'headlines' ? view : 'grid');
    if (step !== GRID_STEP_DEFAULT) {
      root.setAttribute('data-boot-grid', String(step));
      root.style.setProperty('--boot-column', GRID_COLUMNS[step - 1] / 16 + 'rem');
    }
  }

  /**
   * `html[data-boot-tidy]` (Unsorted, the button showed last time) and, on a folder path,
   * `html[data-boot-folder]` with `data-boot-subfolders` (their count, from `FolderShapeCache`): the
   * parts of a library page that arrive after the first paint and move the feed when they do.
   */
  function libraryRoom() {
    try {
      if (path === '/unsorted' && localStorage.getItem(TIDY_KEY) === '1') {
        root.setAttribute('data-boot-tidy', '');
      }
      const folder = /^\/folders\/([^/]+)$/.exec(path);
      if (!folder) return;
      root.setAttribute('data-boot-folder', '');
      const shape = JSON.parse(localStorage.getItem(FOLDER_SHAPE_KEY) || '{}');
      const count = shape && typeof shape === 'object' ? shape[decodeURIComponent(folder[1])] : 0;
      if (Number.isInteger(count) && count > 0) {
        root.setAttribute('data-boot-subfolders', String(Math.min(count, 9)));
      }
    } catch {
      // Storage blocked or broken JSON: no room is held.
    }
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
