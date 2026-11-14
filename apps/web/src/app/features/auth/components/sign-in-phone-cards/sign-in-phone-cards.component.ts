import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { activeLang } from '../../../../core/i18n/active-lang';
import { LinkPreviewCardComponent } from '../../../links/components/link-preview-card/link-preview-card.component';
import type { SignInPhoneItem } from './models/sign-in-phone-item.interface';
import { layoutPhoneCards } from './phone-layout';

const ITEMS: readonly SignInPhoneItem[] = layoutPhoneCards();

/**
 * The strip on top of the phone and tablet sign-in (docs/design/screens/MobileSignIn.dc.html,
 * #411): six of the desktop's saved-link cards, drawn small by `LinkPreviewCardComponent`, in the
 * desktop's seeded scatter (`layoutDriftLane`). Every visit they fly up from the bottom of the
 * screen in a short wave and settle, then each floats on its own loop; the sign-in panel rises
 * after them (see the page styles) and never waits for any of it. Reduced motion (the device or
 * the Animations setting) leaves them at rest, tilted, with no fly-in and no drift. Everything
 * that moves is `transform` / `opacity`. Decorative: hidden from assistive technology and inert.
 * The desktop page has `SignInDriftComponent` instead.
 */
@Component({
  selector: 'app-sign-in-phone-cards',
  imports: [TranslocoPipe, LinkPreviewCardComponent],
  templateUrl: './sign-in-phone-cards.component.html',
  styleUrl: './sign-in-phone-cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', inert: '' },
})
export class SignInPhoneCardsComponent {
  private readonly transloco = inject(TranslocoService);

  protected readonly items = computed(() => {
    // Re-runs on a language switch (`translate` itself is not reactive).
    activeLang();
    return ITEMS.map((item) => ({
      ...item,
      tags: item.card.tags.map((tag) => this.transloco.translate(`auth.signIn.tags.${tag}`)),
    }));
  });
}
