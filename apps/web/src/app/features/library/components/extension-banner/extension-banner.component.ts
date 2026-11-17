import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  LOGO_VARIANT,
  LogoComponent,
} from '@shelfmark/ui';
import { ExtensionBannerService } from '../../../../core/browser-extension/extension-banner.service';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { ThemeService } from '../../../../core/theme/theme.service';
import { extensionPopupSrc } from './extension-popup-src';

/**
 * "Install the extension" at the top of the library (#455, ExtensionInstall mockup): signed-in,
 * desktop Chrome, Edge, Brave or Arc, store URL known (`ExtensionBannerService.bannerShown`). It
 * should stand out (author): an accent band, the real popup screenshot sliding in, the copy rising
 * in after it, a primary Install button. "Not now" closes it for good on this device; the sidebar
 * footer then keeps a "Get the extension" row.
 */
@Component({
  selector: 'app-extension-banner',
  imports: [ButtonComponent, LogoComponent, NgOptimizedImage, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './extension-banner.component.html',
  styleUrl: './extension-banner.component.scss',
})
export class ExtensionBannerComponent {
  protected readonly banner = inject(ExtensionBannerService);
  private readonly theme = inject(ThemeService);
  /** The screenshot needs the room of a wide window (from 80em); narrower, the copy takes it. */
  protected readonly viewport = inject(ViewportService);
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly LOGO_VARIANT = LOGO_VARIANT;
  protected readonly popupSrc = computed(() => extensionPopupSrc(this.theme.resolved()));
}
