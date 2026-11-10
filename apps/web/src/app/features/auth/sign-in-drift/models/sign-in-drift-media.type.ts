import type { SIGN_IN_DRIFT_MEDIA } from './sign-in-drift-media.const';

export type SignInDriftMedia = (typeof SIGN_IN_DRIFT_MEDIA)[keyof typeof SIGN_IN_DRIFT_MEDIA];
