import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { FaviconComponent } from '@shelfmark/ui';
import type { LandingChatMessage } from '../../../models/landing-chat-message.interface';

/** One chat bubble of the hero demo: the message text and its link with the time. */
@Component({
  selector: 'app-landing-chat-bubble',
  imports: [TranslocoPipe, FaviconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-chat-bubble.component.html',
  styleUrl: './landing-chat-bubble.component.scss',
})
export class LandingChatBubbleComponent {
  readonly message = input.required<LandingChatMessage>();
}
