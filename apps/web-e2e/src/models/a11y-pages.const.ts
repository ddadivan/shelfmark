import type { A11yPage } from './a11y-page.interface';
import { LANDING_HEADLINE } from './landing-headline.const';

/**
 * Pages that need no session and work against a deployed build. The signed-in app screens live in
 * the matrix of `a11y-app.spec.ts`.
 */
export const A11Y_PAGES: readonly A11yPage[] = [
  { path: '/', heading: LANDING_HEADLINE },
  { path: '/privacy', heading: 'Privacy policy' },
  { path: '/sign-in', heading: 'All your links on one shelf' },
  { path: '/__e2e/csp', heading: 'CSP test page', ciOnly: true, overlayOpener: 'Open overlay' },
];
