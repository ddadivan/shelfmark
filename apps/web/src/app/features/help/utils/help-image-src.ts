import { THEME, type Theme } from '@shelfmark/ui';
import { HELP_MEDIA } from '../models/help-media.const';

/** The file of an article screenshot (`public/media/help/<slug>-<theme>.webp`) for the theme in use. */
export function helpImageSrc(slug: string, theme: Theme): string {
  return `${HELP_MEDIA.folder}/${slug}-${theme === THEME.Dark ? 'dark' : 'light'}.webp`;
}
