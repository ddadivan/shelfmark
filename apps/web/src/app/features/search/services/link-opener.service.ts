import { Service } from '@angular/core';
import { isMacPlatform } from '../utils/is-mac-platform';

/** Opens a saved link in a new tab. */
@Service()
export class LinkOpener {
  /**
   * Opens `url` through a real anchor click. `background` sends the click with the platform
   * modifier (Cmd on macOS, Ctrl elsewhere), so the browser keeps the current tab in front.
   */
  open(url: string, background: boolean): void {
    const mac = isMacPlatform();
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    if (background) {
      anchor.dispatchEvent(
        new MouseEvent('click', { cancelable: true, metaKey: mac, ctrlKey: !mac }),
      );
    } else {
      anchor.click();
    }
  }
}
