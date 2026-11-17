import { THEME } from '@shelfmark/ui';
import { extensionPopupSrc } from './extension-popup-src';

describe('extensionPopupSrc', () => {
  it('picks the screenshot of the page base', () => {
    expect(extensionPopupSrc(THEME.Light)).toBe('/media/extension/popup-form-light.webp');
    expect(extensionPopupSrc(THEME.Dark)).toBe('/media/extension/popup-form-dark.webp');
  });
});
