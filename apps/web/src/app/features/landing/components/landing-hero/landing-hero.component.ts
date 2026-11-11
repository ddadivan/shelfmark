import { AppLinkDirective } from '../../app-link.directive';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_SIZE, BUTTON_VARIANT, ButtonComponent } from '@shelfmark/ui';
import { LandingMotionService } from '../../landing-motion.service';
import { LANDING_CHAT_MESSAGES } from '../../models/landing-chat-messages.const';
import { LANDING_LINKS } from '../../models/landing-links.const';
import { injectSignedIn } from '../../inject-signed-in';
import { LandingChatComponent } from '../landing-chat/landing-chat.component';

/** First screen: the headline with its lead, the demo and sign-in buttons and the "Saved Messages" demo. */
@Component({
  selector: 'app-landing-hero',
  imports: [AppLinkDirective, TranslocoPipe, ButtonComponent, LandingChatComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-hero.component.html',
  styleUrl: './landing-hero.component.scss',
})
export class LandingHeroComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly LANDING_LINKS = LANDING_LINKS;
  protected readonly signedIn = injectSignedIn();
  protected readonly motion = inject(LandingMotionService);
  protected readonly messages = LANDING_CHAT_MESSAGES;
}
