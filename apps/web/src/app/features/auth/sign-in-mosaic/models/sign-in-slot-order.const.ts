import { SIGN_IN_SLOT } from './sign-in-slot.const';
import type { SignInSlot } from './sign-in-slot.type';

/** The slot of each tile at the start, in tile order. Slot `e` is the wide one. */
export const SIGN_IN_SLOT_ORDER: readonly SignInSlot[] = [
  SIGN_IN_SLOT.A,
  SIGN_IN_SLOT.B,
  SIGN_IN_SLOT.C,
  SIGN_IN_SLOT.D,
  SIGN_IN_SLOT.E,
  SIGN_IN_SLOT.F,
  SIGN_IN_SLOT.G,
  SIGN_IN_SLOT.H,
];
