import type { SIGN_IN_DRIFT_SIDE } from './sign-in-drift-side.const';

export type SignInDriftSide = (typeof SIGN_IN_DRIFT_SIDE)[keyof typeof SIGN_IN_DRIFT_SIDE];
