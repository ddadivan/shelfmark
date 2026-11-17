import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  CardComponent,
  ChipComponent,
  FaviconComponent,
  LogoComponent,
} from '@shelfmark/ui';
import { PopupStore } from '../../popup.store';
import { SIGN_IN_CARDS } from './models/sign-in-cards.const';

/**
 * State 6: the phone sign-in strip of saved-link cards (fly in on every open, then float) above the
 * sign-in button, so the popup and the site look like one product. The strip is `inert`: decoration.
 */
@Component({
  selector: 'ext-popup-signed-out',
  templateUrl: './popup-signed-out.component.html',
  styleUrl: './popup-signed-out.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ext-screen' },
  imports: [
    ButtonComponent,
    CardComponent,
    ChipComponent,
    FaviconComponent,
    LogoComponent,
    TranslocoPipe,
  ],
})
export class PopupSignedOutComponent {
  protected readonly store = inject(PopupStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  protected readonly cards = computed(() => {
    const format = new Intl.RelativeTimeFormat(this.transloco.getActiveLang(), { numeric: 'auto' });
    return SIGN_IN_CARDS.map((card) => ({
      ...card,
      letter: card.host.charAt(0).toUpperCase(),
      saved: format.format(-card.daysAgo, 'day'),
    }));
  });
}
