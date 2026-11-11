import type { PromoDevice } from './promo-device.type';
import type { PromoTheme } from './promo-theme.type';

/** One recording: a theme on a device, at the viewport size the video is recorded in. */
export interface PromoVariant {
  readonly theme: PromoTheme;
  readonly device: PromoDevice;
  readonly width: number;
  readonly height: number;
}
