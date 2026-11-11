import type { AppFont } from './app-font.type';
import type { CardPreview } from './card-preview.type';
import type { Density } from './density.type';
import type { TextSize } from './text-size.type';

/**
 * Settings › Appearance › Text and layout and Cards (#285), part of `UserSettingsResponse`. Part
 * of the appearance: the first write of any of them marks it saved (`appearanceSaved`).
 */
export interface LayoutSettings {
  /** Default `m`. */
  textSize: TextSize;
  /** Default `onest`. */
  font: AppFont;
  /** Default `comfortable`. */
  density: Density;
  /** The image area of cards. Default `large`. */
  cardPreview: CardPreview;
  /** Domain and favicon above the card title. Default on. */
  cardSite: boolean;
  /** The note under the card title. Default on. */
  cardNotes: boolean;
  /** Tag chips at the bottom of the card. Default on. */
  cardTags: boolean;
}
