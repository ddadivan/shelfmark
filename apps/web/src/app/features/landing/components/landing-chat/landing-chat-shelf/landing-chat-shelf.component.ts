import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { FaviconComponent } from '@shelfmark/ui';
import { LANDING_CHAT_TIMING } from '../../../models/landing-chat-timing.const';
import { LANDING_SHELF_GROUPS } from '../../../models/landing-shelf-groups.const';

/**
 * The shelf of the hero demo: the chat's links in folders, each with a note. The folders fade
 * in and the cards land one after another (staggered by their position); under
 * `prefers-reduced-motion` they simply appear.
 */
@Component({
  selector: 'app-landing-chat-shelf',
  imports: [TranslocoPipe, FaviconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-chat-shelf.component.html',
  styleUrl: './landing-chat-shelf.component.scss',
})
export class LandingChatShelfComponent {
  protected readonly groups = LANDING_SHELF_GROUPS;
  protected readonly timing = LANDING_CHAT_TIMING;
}
