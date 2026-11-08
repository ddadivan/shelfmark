import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LANDING_LINKS } from '../../models/landing-links.const';

/** Page footer: copyright and the GitHub link. */
@Component({
  selector: 'app-landing-footer',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-footer.component.html',
  styleUrl: './landing-footer.component.scss',
})
export class LandingFooterComponent {
  protected readonly LANDING_LINKS = LANDING_LINKS;
}
