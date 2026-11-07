/**
 * Targets of the landing page links. The demo entry is `/sign-in` until the demo sandbox
 * (issue #67) exists; then `Demo` points at its entry route.
 */
export const LANDING_LINKS = {
  // TODO(#66): switch to router navigation once the `/sign-in` route lands (PR #86).
  SignIn: '/sign-in',
  // TODO(#67): point at the demo entry once the demo sandbox exists.
  Demo: '/sign-in',
  Repository: 'https://github.com/ddadivan/shelfmark',
  DecisionLog: 'https://github.com/ddadivan/shelfmark/tree/main/docs/adr',
  HowItsBuilt: '#how',
} as const;
