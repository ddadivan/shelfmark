import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  IllustrationComponent,
  LogoComponent,
} from '@shelfmark/ui';
import { PopupStore } from '../../popup.store';

/**
 * Signed out (Shelf 07-extension): the logo row, the collect scene, "Sign in to save this page"
 * with its line, the privacy note and "Sign in to Shelfmark" in the foot.
 */
@Component({
  selector: 'ext-popup-signed-out',
  templateUrl: './popup-signed-out.component.html',
  styleUrl: './popup-signed-out.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ext-screen' },
  imports: [ButtonComponent, IllustrationComponent, LogoComponent, TranslocoPipe],
})
export class PopupSignedOutComponent {
  protected readonly store = inject(PopupStore);
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
}
