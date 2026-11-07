import { SIGN_IN_REASON } from './models/sign-in-reason.const';
import { SignInReason } from './models/sign-in-reason.type';

const REASONS: readonly unknown[] = Object.values(SIGN_IN_REASON);

/** True for the `?reason=` values the sign-in page knows how to explain. */
export function isSignInReason(value: unknown): value is SignInReason {
  return REASONS.includes(value);
}
