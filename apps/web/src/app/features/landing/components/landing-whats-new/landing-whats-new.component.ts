import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LocaleDatePipe } from '../../../../core/i18n/locale-date.pipe';
import { TranslocoPipe } from '@jsverse/transloco';
import { LANDING_WHATS_NEW } from '../../models/landing-whats-new.const';
import { LandingRevealDirective } from '../../directives/landing-reveal.directive';

/** "What's new" for signed-in people on `/about` (HowItWorks.dc.html, board 3). */
@Component({
  selector: 'app-landing-whats-new',
  imports: [LocaleDatePipe, LandingRevealDirective, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-whats-new.component.html',
  styleUrl: './landing-whats-new.component.scss',
})
export class LandingWhatsNewComponent {
  protected readonly entries = LANDING_WHATS_NEW;
}
