import { ChangeDetectionStrategy, Component, output } from '@angular/core';
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

  /** The visitor asked for "How it's built"; the page loads the deferred sections and scrolls. */
  readonly howItsBuiltRequested = output<void>();

  protected onHowItsBuilt(event: MouseEvent): void {
    // Open-in-new-tab gestures keep the plain link: `/#how` then loads the page with the hash.
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    // The target may not be rendered yet (deferred); the page scrolls once it is.
    event.preventDefault();
    this.howItsBuiltRequested.emit();
  }
}
