import { COLOR_SCHEME } from '../../src/models/color-scheme.const';
import { PROMO_DEVICE } from './promo-device.const';
import type { PromoVariant } from './promo-variant.interface';

/**
 * Every recording `npx nx run web-e2e:promo` makes (#315: two, one per layout): the desktop at
 * 1440 x 900 and the phone at 390 x 844, both starting in the light theme (the video itself
 * switches to dark and to an own accent colour in its last chapter).
 */
export const PROMO_VARIANTS: readonly PromoVariant[] = [
  { theme: COLOR_SCHEME.Light, device: PROMO_DEVICE.Desktop, width: 1440, height: 900 },
  { theme: COLOR_SCHEME.Light, device: PROMO_DEVICE.Phone, width: 390, height: 844 },
];
