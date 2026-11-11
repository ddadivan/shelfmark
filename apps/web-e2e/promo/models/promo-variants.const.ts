import { COLOR_SCHEME } from '../../src/models/color-scheme.const';
import { PROMO_DEVICE } from './promo-device.const';
import type { PromoVariant } from './promo-variant.interface';

const DESKTOP = { device: PROMO_DEVICE.Desktop, width: 1280, height: 720 } as const;
const PHONE = { device: PROMO_DEVICE.Phone, width: 390, height: 844 } as const;

/** Every recording `npx nx run web-e2e:promo` makes: light and dark, desktop and phone. */
export const PROMO_VARIANTS: readonly PromoVariant[] = [
  { theme: COLOR_SCHEME.Light, ...DESKTOP },
  { theme: COLOR_SCHEME.Dark, ...DESKTOP },
  { theme: COLOR_SCHEME.Light, ...PHONE },
  { theme: COLOR_SCHEME.Dark, ...PHONE },
];
