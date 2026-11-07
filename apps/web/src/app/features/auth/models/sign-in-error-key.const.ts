import { SIGN_IN_ERROR } from '../../../core/auth/models/sign-in-error.const';
import { SignInError } from '../../../core/auth/models/sign-in-error.type';

/** Translation key of the notice for each known `?error=` code. */
export const SIGN_IN_ERROR_KEY = {
  [SIGN_IN_ERROR.EmailNotFound]: 'auth.signIn.error.emailMissing',
  [SIGN_IN_ERROR.AccessDenied]: 'auth.signIn.error.denied',
  [SIGN_IN_ERROR.StateMismatch]: 'auth.signIn.error.restart',
  [SIGN_IN_ERROR.PleaseRestart]: 'auth.signIn.error.restart',
  [SIGN_IN_ERROR.AccountNotLinked]: 'auth.signIn.error.notLinked',
  [SIGN_IN_ERROR.UnableToLinkAccount]: 'auth.signIn.error.notLinked',
} as const satisfies Record<SignInError, string>;
