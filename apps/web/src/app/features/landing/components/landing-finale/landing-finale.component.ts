import { AppLinkDirective } from '../../directives/app-link.directive';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  ICON_SIZE,
  IconComponent,
} from '@shelfmark/ui';
import { BrowserExtensionService } from '../../../../core/browser-extension/browser-extension.service';
import { LANDING_LINKS } from '../../models/landing-links.const';
import { injectSignedIn } from '../../utils/inject-signed-in';
import { LandingRevealDirective } from '../../directives/landing-reveal.directive';

/**
 * Closing call to action: open the demo or sign in. On a desktop Chrome, Edge, Brave or Arc a
 * line under the lead links the browser extension (#455); the block is deferred below the fold,
 * so the check costs the first paint nothing.
 */
@Component({
  selector: 'app-landing-finale',
  imports: [
    AppLinkDirective,
    LandingRevealDirective,
    TranslocoPipe,
    ButtonComponent,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-finale.component.html',
  styleUrl: './landing-finale.component.scss',
})
export class LandingFinaleComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly LANDING_LINKS = LANDING_LINKS;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly signedIn = injectSignedIn();
  protected readonly extension = inject(BrowserExtensionService);
}
