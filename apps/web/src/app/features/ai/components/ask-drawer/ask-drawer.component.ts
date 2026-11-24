import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, DRAWER_SIDE, DRAWER_WIDTH, DrawerComponent } from '@shelfmark/ui';
import { AskPanelWidth } from '../../services/ask-panel-width.service';
import { AskStore } from '../../services/ask.store';
import { AskComposerComponent } from '../ask-composer/ask-composer.component';
import { AskConversationComponent } from '../ask-conversation/ask-conversation.component';

/**
 * Ask your shelf as a 440px drawer from the inline-end edge (desktop and tablet with a header,
 * `AskPanelService`; Shelf 11-ask in a panel): "New conversation" on top once something was asked,
 * the conversation (its start names the panel "Ask your shelf"), the composer and its fine line at
 * the bottom. Owns the conversation (`AskStore`): closing
 * forgets it and stops a stream. From 64em its inline-start edge drags the width (440px up to
 * `min(880px, 70vw)`, kept on the device by `AskPanelWidth`).
 */
@Component({
  selector: 'app-ask-drawer',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    DrawerComponent,
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
  protected readonly width = inject(AskPanelWidth);
  protected readonly DRAWER_SIDE = DRAWER_SIDE;
  protected readonly DRAWER_WIDTH = DRAWER_WIDTH;
}
