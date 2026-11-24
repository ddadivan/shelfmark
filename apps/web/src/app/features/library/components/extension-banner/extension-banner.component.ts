import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  LOGO_VARIANT,
  LogoComponent,
} from '@shelfmark/ui';
import { ExtensionBannerService } from '../../../../core/browser-extension/extension-banner.service';

/**
 * "Install the extension" at the top of the library (#455; Shelf 14-system "Extension offer in the
 * library"): signed-in, desktop Chrome, Edge, Brave or Arc, store URL known
 * (`ExtensionBannerService.bannerShown`). One sage strip: the mark, the title and the sentence, a
 * small primary Install button and ×. "Not now" (×) closes it for good on this device; the sidebar
 * footer then keeps a "Get the extension" row.
 */
@Component({
  selector: 'app-extension-banner',
  imports: [ButtonComponent, LogoComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './extension-banner.component.html',
  styleUrl: './extension-banner.component.scss',
})
export class ExtensionBannerComponent {
  protected readonly banner = inject(ExtensionBannerService);
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly LOGO_VARIANT = LOGO_VARIANT;
}
