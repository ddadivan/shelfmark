import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LogoComponent } from '@shelfmark/ui';
import { PRIVACY_LINKS } from './models/privacy-links.const';

/** Public privacy policy (`/privacy`): static text from translation keys, no data, no guard. */
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
