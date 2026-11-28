import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ExtensionBannerService } from '../../core/browser-extension/extension-banner.service';

/**
 * The app skeleton of `index.html` as a component (#410): the same markup and classes, styled by
 * the global `_boot-skeleton.scss`, so a page that leads into the app (the demo start) shows one
 * continuous skeleton from the first paint to the library. Decorative: the page announces itself.
 * It draws the List and Headlines rows too (the script sets `html[data-boot-view]` on /demo, the
 * stylesheet shows the view); it is always the library, so no page variants. It holds the place of the library's extension banner when the app will show it (#490).
 */
@Component({
  selector: 'app-boot-skeleton',
  templateUrl: './boot-skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BootSkeletonComponent {
  protected readonly extensionBanner = inject(ExtensionBannerService);
  protected readonly rows = Array.from({ length: 12 }, (_, index) => index);
  protected readonly cards = Array.from({ length: 48 }, (_, index) => index);
}
