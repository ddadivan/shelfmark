import type { SIGN_IN_DRIFT_LAYER } from './sign-in-drift-layer.const';

export type SignInDriftLayer = (typeof SIGN_IN_DRIFT_LAYER)[keyof typeof SIGN_IN_DRIFT_LAYER];
