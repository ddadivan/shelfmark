import type { A11yPage } from './a11y-page.interface';
import { LANDING_HEADLINE } from './landing-headline.const';

export const A11Y_PAGES: readonly A11yPage[] = [
  { path: '/', heading: LANDING_HEADLINE },
  { path: '/sign-in', heading: 'All your links on one shelf' },
  {
    path: '/settings',
    heading: 'Settings',
    signedIn: true,
    // The account menu trigger is named "Account menu"; the avatar initials inside it are
    // aria-hidden, but axe still counts them as visible text (WCAG 2.5.3).
    disabledRules: ['label-content-name-mismatch'],
  },
  { path: '/__e2e/csp', heading: 'CSP test page', ciOnly: true, overlayOpener: 'Open overlay' },
];
