import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ButtonComponent,
  DRAWER_SIDE,
  DRAWER_WIDTH,
  DrawerComponent,
  IconComponent,
} from '@shelfmark/ui';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskStore } from '../../services/ask.store';
import { askAllowanceLine } from '../../utils/ask-allowance-line';
import { AskComposerComponent } from '../ask-composer/ask-composer.component';
import { AskConversationComponent } from '../ask-conversation/ask-conversation.component';

/**
 * Ask your shelf as a 440px drawer from the inline-end edge (desktop and tablet with a header,
 * `AskPanelService`): title, questions left and "New question" on top, the conversation, the
 * composer at the bottom. Owns the conversation (`AskStore`): closing forgets it and stops a
 * stream.
 */
@Component({
  selector: 'app-ask-drawer',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    DrawerComponent,
    IconComponent,
    AskComposerComponent,
    AskConversationComponent,
  ],
  providers: [AskStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ask-drawer.component.html',
  styleUrl: './ask-drawer.component.scss',
})
export class AskDrawerComponent {
  protected readonly store = inject(AskStore);
  private readonly settings = inject(AiSettingsStore);
  protected readonly DRAWER_SIDE = DRAWER_SIDE;
  protected readonly DRAWER_WIDTH = DRAWER_WIDTH;

  protected readonly left = computed(() => {
    const allowance = this.settings.askAllowance();
    return allowance ? askAllowanceLine(allowance) : null;
  });
}
