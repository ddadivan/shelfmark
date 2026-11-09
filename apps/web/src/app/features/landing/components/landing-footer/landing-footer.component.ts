import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LANDING_LINKS } from '../../models/landing-links.const';

/** Page footer: copyright, the privacy policy and the GitHub link. */
@Component({
  selector: 'app-landing-footer',
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-footer.component.html',
  styleUrl: './landing-footer.component.scss',
})
export class LandingFooterComponent {
  protected readonly LANDING_LINKS = LANDING_LINKS;
}
