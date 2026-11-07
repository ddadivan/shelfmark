import { SIGN_IN_REASON } from './sign-in-reason.const';

export type SignInReason = (typeof SIGN_IN_REASON)[keyof typeof SIGN_IN_REASON];
