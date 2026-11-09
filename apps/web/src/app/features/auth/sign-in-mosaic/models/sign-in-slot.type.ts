import type { SIGN_IN_SLOT } from './sign-in-slot.const';

export type SignInSlot = (typeof SIGN_IN_SLOT)[keyof typeof SIGN_IN_SLOT];
