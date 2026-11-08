import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_SIZE, BUTTON_VARIANT, ButtonComponent } from '@shelfmark/ui';
import { LANDING_LINKS } from '../../models/landing-links.const';
import { LandingRevealDirective } from '../../directives/landing-reveal.directive';

/** Closing call to action: open the demo or sign in. */
@Component({
  selector: 'app-landing-finale',
  imports: [LandingRevealDirective, TranslocoPipe, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-finale.component.html',
  styleUrl: './landing-finale.component.scss',
})
export class LandingFinaleComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly LANDING_LINKS = LANDING_LINKS;
}
