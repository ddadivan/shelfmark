import { DEMO_ERROR } from '../../../core/auth/models/demo-error.const';
import type { DemoError } from '../../../core/auth/models/demo-error.type';
import { SIGN_IN_REASON } from '../../../core/auth/models/sign-in-reason.const';
import type { SignInReason } from '../../../core/auth/models/sign-in-reason.type';

/** The `/sign-in?reason=` value that explains each demo failure. */
export const DEMO_ERROR_REASON = {
  [DEMO_ERROR.RateLimited]: SIGN_IN_REASON.DemoLimit,
  [DEMO_ERROR.Unavailable]: SIGN_IN_REASON.DemoUnavailable,
} as const satisfies Record<DemoError, SignInReason>;
