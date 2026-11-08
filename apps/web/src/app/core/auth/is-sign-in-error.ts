import { SIGN_IN_ERROR } from './models/sign-in-error.const';
import { SignInError } from './models/sign-in-error.type';

const ERRORS: readonly unknown[] = Object.values(SIGN_IN_ERROR);

/** True for the `?error=` codes the sign-in page knows how to explain. */
export function isSignInError(value: unknown): value is SignInError {
  return ERRORS.includes(value);
}
