import { THEME } from '@shelfmark/ui';
import { helpImageSrc } from './help-image-src';

describe('helpImageSrc', () => {
  it('picks the file of the theme', () => {
    expect(helpImageSrc('today', THEME.Light)).toBe('/media/help/today-light.webp');
    expect(helpImageSrc('today', THEME.Dark)).toBe('/media/help/today-dark.webp');
  });
});
