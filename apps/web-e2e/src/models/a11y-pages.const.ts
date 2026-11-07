import type { A11yPage } from './a11y-page.interface';

export const A11Y_PAGES: readonly A11yPage[] = [
  { path: '/', heading: 'Shelfmark' },
  { path: '/privacy', heading: 'Privacy policy' },
  { path: '/__e2e/csp', heading: 'CSP test page', ciOnly: true, overlayOpener: 'Open overlay' },
];
