import type { SIGN_IN_CARD_LAYER } from './sign-in-card-layer.const';

export type SignInCardLayer = (typeof SIGN_IN_CARD_LAYER)[keyof typeof SIGN_IN_CARD_LAYER];
