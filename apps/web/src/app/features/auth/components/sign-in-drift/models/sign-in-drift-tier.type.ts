import type { SIGN_IN_DRIFT_TIER } from './sign-in-drift-tier.const';

export type SignInDriftTier = (typeof SIGN_IN_DRIFT_TIER)[keyof typeof SIGN_IN_DRIFT_TIER];
