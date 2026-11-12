import { AppLinkDirective } from '../../directives/app-link.directive';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_SIZE, BUTTON_VARIANT, ButtonComponent } from '@shelfmark/ui';
import { LANDING_LINKS } from '../../models/landing-links.const';
import { injectSignedIn } from '../../utils/inject-signed-in';
import { LandingHeroPreviewComponent } from '../landing-hero-preview/landing-hero-preview.component';

/** First screen: the headline with its lead, the start and demo buttons and the app preview. */
@Component({
  selector: 'app-landing-hero',
  imports: [AppLinkDirective, TranslocoPipe, ButtonComponent, LandingHeroPreviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-hero.component.html',
  styleUrl: './landing-hero.component.scss',
})
export class LandingHeroComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly LANDING_LINKS = LANDING_LINKS;
  protected readonly signedIn = injectSignedIn();
}
