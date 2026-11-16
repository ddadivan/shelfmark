import { THEME, type Theme } from '@shelfmark/ui';
import type { ChangelogImage } from '../models/changelog-image.interface';

/** The file of a screenshot for the theme the page is drawn on. */
export function changelogImageSrc(image: ChangelogImage, theme: Theme): string {
  return theme === THEME.Dark ? image.dark : image.light;
}
