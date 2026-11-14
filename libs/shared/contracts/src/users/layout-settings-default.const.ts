import { APP_FONT } from './app-font.const';
import { CARD_PREVIEW } from './card-preview.const';
import { DENSITY } from './density.const';
import { FOLDER_HIGHLIGHT } from './folder-highlight.const';
import type { LayoutSettings } from './layout-settings.interface';
import { TEXT_SIZE } from './text-size.const';

/** What a new account has (Themes mockup) and what the app shows until the account tells. */
export const LAYOUT_SETTINGS_DEFAULT: Readonly<LayoutSettings> = {
  textSize: TEXT_SIZE.M,
  font: APP_FONT.Onest,
  density: DENSITY.Comfortable,
  cardPreview: CARD_PREVIEW.Large,
  cardSite: true,
  cardNotes: true,
  cardTags: true,
  folderHighlight: FOLDER_HIGHLIGHT.Stripe,
};
