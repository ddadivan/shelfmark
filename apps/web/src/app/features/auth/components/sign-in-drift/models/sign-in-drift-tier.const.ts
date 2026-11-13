/** Which layout of the sign-in lanes is drawn: how many cards, from which window width. */
export const SIGN_IN_DRIFT_TIER = {
  /** 64em to 80em: four cards a side. */
  Narrow: 'narrow',
  /** 80em to 160em: seven a side. */
  Wide: 'wide',
  /** From 160em (2560px, 4K and 5K screens): eleven a side. */
  Huge: 'huge',
} as const;
