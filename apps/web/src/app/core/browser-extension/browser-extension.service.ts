import { DOCUMENT } from '@angular/common';
import { Service, computed, inject } from '@angular/core';
import { ViewportService } from '../layout/viewport.service';
import { EXTENSION_STORE_HREF } from './extension-store-url.token';
import { isExtensionBrowser } from './is-extension-browser';

/**
 * Whether to offer the browser extension (#455): its store page is known, the browser installs
 * from the Chrome Web Store (Chrome, Edge, Brave, Arc) and the window is desktop-wide
 * (`ViewportService.desktop`, from 64em). Entries render with `@if (extension.offered())`, never
 * hidden by CSS, so phones and other browsers get no DOM at all.
 */
@Service()
export class BrowserExtensionService {
  /** The Chrome Web Store page; empty until the item is published. */
  readonly storeUrl = inject(EXTENSION_STORE_HREF);
  private readonly viewport = inject(ViewportService);
  private readonly supported = isExtensionBrowser(inject(DOCUMENT).defaultView?.navigator);

  /**
   * The browser installs the extension and the window is desktop-wide, whether or not the store
   * page is known: the landing mentions the extension (without a link) on this alone.
   */
  readonly fits = computed(() => this.supported && this.viewport.desktop());
  /** `fits` and the store page is known: the install entries of the app. */
  readonly offered = computed(() => this.storeUrl !== '' && this.fits());
}
