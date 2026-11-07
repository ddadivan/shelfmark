import { SIGN_IN_REASON } from '../../../core/auth/models/sign-in-reason.const';

/** Translation key of the notice for each `?reason=` value. */
export const SIGN_IN_REASON_KEY = {
  [SIGN_IN_REASON.SessionExpired]: 'auth.signIn.reason.sessionExpired',
  [SIGN_IN_REASON.DemoExpired]: 'auth.signIn.reason.demoExpired',
} as const;
