import { AppLinkDirective } from '../../directives/app-link.directive';
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_SIZE, BUTTON_VARIANT, ButtonComponent, LogoComponent } from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { LANDING_LINKS } from '../../models/landing-links.const';
import { injectSignedIn } from '../../utils/inject-signed-in';

/** Top bar of the landing page: logo, "How it works" and "Privacy", sign in and get started. */
@Component({
  selector: 'app-landing-header',
  imports: [AppLinkDirective, TranslocoPipe, LogoComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-header.component.html',
  styleUrl: './landing-header.component.scss',
})
export class LandingHeaderComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly LANDING_LINKS = LANDING_LINKS;
  protected readonly signedIn = injectSignedIn();

  /** The section links are secondary on a phone (not rendered there); sign-in stays. */
  protected readonly phone = inject(ViewportService).phone;

  /** The visitor asked for "How it works"; the page loads the deferred sections and scrolls. */
  readonly howItWorksRequested = output<void>();

  protected onHowItWorks(event: MouseEvent): void {
    // Open-in-new-tab gestures keep the plain link: `/#works` then loads the page with the hash.
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    // The target may not be rendered yet (deferred); the page scrolls once it is.
    event.preventDefault();
    this.howItWorksRequested.emit();
  }
}
