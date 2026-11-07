import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LogoComponent } from '@shelfmark/ui';
import { PRIVACY_LINKS } from './models/privacy-links.const';

// Error monitoring (Sentry) is deliberately not described here until it is wired in: see #109.
@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink, TranslocoPipe, LogoComponent],
  templateUrl: './privacy.page.html',
  styleUrl: './privacy.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PrivacyPage {
  protected readonly links = PRIVACY_LINKS;
}
