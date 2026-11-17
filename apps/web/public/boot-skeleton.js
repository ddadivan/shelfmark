// First paint of a signed-in start (#410). An external script, so the strict CSP stays: it only
// decides whether the app skeleton of index.html shows (`html[data-boot-skeleton]`, styles in
// src/_boot-skeleton.scss) and, for a fixed light or dark preference, which theme it wears. The
// app (ThemeService, AuthStore) takes over and removes the skeleton once a page is rendered.
(function () {
  const HINT_KEY = 'sm-session-hint'; // SESSION_HINT_STORAGE_KEY
  const DEMO_HINT = 'demo'; // SESSION_HINT_KIND.Demo: the hint of a demo session (#440)
  const THEME_KEY = 'sm-theme'; // THEME_STORAGE_KEY
  const MAX_MS = 15000; // never leave an overlay over a page that failed to start
  const root = document.documentElement;
  const path = location.pathname.replace(/(.)\/$/, '$1');
  // Pages a guest can be on: the hint (a session that may have ended) is not trusted there.
  const guestPage = /^\/(sign-in|about|privacy|changelog|c\/.*)$/.test(path);
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
  root.setAttribute('data-boot-skeleton', '');
  setTimeout(function () {
    const left = document.querySelector('[data-app-skeleton]');
    if (left) left.remove();
  }, MAX_MS);
})();
