import { THEME, type Theme } from '@shelfmark/ui';

/** The popup screenshot (#455) for the base the page is drawn on (`public/media/extension`). */
export function extensionPopupSrc(theme: Theme): string {
  return `/media/extension/popup-form-${theme === THEME.Dark ? THEME.Dark : THEME.Light}.webp`;
}
