import type { PromoDevice } from './promo-device.type';
import type { PromoTheme } from './promo-theme.type';

/** One recording: a device and the theme it starts in, at the viewport size it is recorded in. */
export interface PromoVariant {
  readonly theme: PromoTheme;
  readonly device: PromoDevice;
  readonly width: number;
  readonly height: number;
}
