import type { PROMO_DEVICE } from './promo-device.const';

export type PromoDevice = (typeof PROMO_DEVICE)[keyof typeof PROMO_DEVICE];
