import { APP_PATH } from '../../../models/app-path.const';

/** Targets of the landing page links. `Demo` is the demo start route (`/demo`). */
export const LANDING_LINKS = {
  // TODO(#66): switch to router navigation once the `/sign-in` route lands (PR #86).
  SignIn: '/sign-in',
  Demo: `/${APP_PATH.Demo}`,
  Repository: 'https://github.com/ddadivan/shelfmark',
  DecisionLog: 'https://github.com/ddadivan/shelfmark/tree/main/docs/adr',
  HowItsBuilt: '#how',
} as const;
