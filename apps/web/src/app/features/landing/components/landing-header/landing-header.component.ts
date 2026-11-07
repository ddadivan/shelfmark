import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LogoComponent, ButtonComponent } from '@shelfmark/ui';
import { LANDING_LINKS } from '../../models/landing-links.const';

/** Top bar of the landing page: logo, anchor to "How it's built", GitHub and sign-in. */
@Component({
  selector: 'app-landing-header',
  imports: [TranslocoPipe, LogoComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-header.component.html',
  styleUrl: './landing-header.component.scss',
})
export class LandingHeaderComponent {
  protected readonly LANDING_LINKS = LANDING_LINKS;
}
