import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_VARIANT, ButtonComponent, FaviconComponent, LogoComponent } from '@shelfmark/ui';
import { LANDING_CHAT_MESSAGES } from '../../models/landing-chat-messages.const';
import { LANDING_SHELF_GROUPS } from '../../models/landing-shelf-groups.const';

/**
 * The hero demo: a phone with the "Saved Messages" chat (five links, static final frame) and
 * a button that swaps it for the shelf the same links land on. The swap is a plain state
 * toggle; the animation is added later (#104).
 */
@Component({
  selector: 'app-landing-chat',
  imports: [TranslocoPipe, ButtonComponent, FaviconComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-chat.component.html',
  styleUrl: './landing-chat.component.scss',
})
export class LandingChatComponent {
  protected readonly messages = LANDING_CHAT_MESSAGES;
  protected readonly groups = LANDING_SHELF_GROUPS;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  /** True once the links are on the shelf instead of in the chat. */
  protected readonly sorted = signal(false);

  protected toggle(): void {
    this.sorted.update((value) => !value);
  }
}
