import { APP_PATH } from '../../../models/app-path.const';

/** Targets of the landing page links. `Demo` is the demo start route (`/demo`). */
export const LANDING_LINKS = {
  // TODO(#66): switch to router navigation once the `/sign-in` route lands (PR #86).
  SignIn: '/sign-in',
  Demo: `/${APP_PATH.Demo}`,
  /** "Back to my shelf" on `/about` for a signed-in person. */
  Shelf: `/${APP_PATH.Links}`,
  Privacy: `/${APP_PATH.Privacy}`,
  /** The public changelog (#424): the footer and "What's new" on `/about`. */
  Changelog: `/${APP_PATH.Changelog}`,
  /** The public Help center (Shelf 17-help). */
  Help: `/${APP_PATH.Help}`,
  Repository: 'https://github.com/ddadivan/shelfmark',
  DecisionLog: 'https://github.com/ddadivan/shelfmark/tree/main/docs/adr',
  HowItsBuilt: '#how',
  /** The optional AI section. */
  Ai: '#ai',
  /** The "Save once, find in seconds" section (the bento). */
  HowItWorks: '#works',
} as const;
