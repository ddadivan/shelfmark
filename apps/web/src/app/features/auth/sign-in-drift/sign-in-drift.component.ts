import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { FaviconComponent } from '@shelfmark/ui';
import { SIGN_IN_DRIFT_CARDS } from './models/sign-in-drift-cards.const';

/**
 * Four saved-link cards that drift around the glass sign-in card on a desktop
 * (docs/design/screens/SignIn.dc.html). Each floats on its own slow loop, enters once, and in
 * turn "lands" with an accent ring like a newly saved link (the ring of the phone mosaic).
 * `prefers-reduced-motion` keeps them still, tilted. Decorative: hidden from assistive technology.
 */
@Component({
  selector: 'app-sign-in-drift',
  imports: [TranslocoPipe, FaviconComponent],
  templateUrl: './sign-in-drift.component.html',
  styleUrl: './sign-in-drift.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class SignInDriftComponent {
  protected readonly SIGN_IN_DRIFT_CARDS = SIGN_IN_DRIFT_CARDS;
}
