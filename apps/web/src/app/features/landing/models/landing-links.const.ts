/**
 * Targets of the landing page links. The demo entry is `/sign-in` until the demo sandbox
 * (issue #67) exists; then `Demo` points at its entry route.
 */
export const LANDING_LINKS = {
  SignIn: '/sign-in',
  Demo: '/sign-in',
  Repository: 'https://github.com/ddadivan/shelfmark',
  DecisionLog: 'https://github.com/ddadivan/shelfmark/tree/main/docs/adr',
  HowItsBuilt: '#how',
} as const;
