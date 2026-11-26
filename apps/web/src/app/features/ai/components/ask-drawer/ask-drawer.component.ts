import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ButtonComponent,
  DRAWER_SIDE,
  DRAWER_WIDTH,
  DrawerComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import { APP_PATH } from '../../../../models/app-path.const';
import { ASK_CONVERSATION_PARAM } from '../../models/ask-conversation-param.const';
import { AskLeaveGuard } from '../../services/ask-leave-guard.service';
import { AskPanelWidth } from '../../services/ask-panel-width.service';
import { AskStore } from '../../services/ask.store';
import { listenBeforeUnload } from '../../../../core/browser/listen-before-unload';
import { AskComposerComponent } from '../ask-composer/ask-composer.component';
import { AskConversationComponent } from '../ask-conversation/ask-conversation.component';

/**
 * Ask your shelf as a 440px drawer from the inline-end edge (a question handed over from search,
 * `AskPanelService`; Shelf 11-ask in a panel): "New conversation" on top once something was asked,
 * "Open full page" (the Ask page with the conversation list, continuing this conversation once the
 * server stored it), the conversation, the composer and its fine line at the bottom. Owns the
 * conversation (`AskStore`): the server keeps finished turns in the Ask history (ADR 0055
 * amendment); closing, New conversation and Open full page ask first while something is not stored
 * (`AskLeaveGuard`), and so does the browser on tab close or reload. From 64em its inline-start edge
 * drags the width (440px up to `min(880px, 70vw)`, kept on the device by `AskPanelWidth`).
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
  private readonly leave = inject(AskLeaveGuard);
  private readonly router = inject(Router);
  private readonly ref = inject(UiDialogRef, { optional: true });

  constructor() {
    // Esc, the scrim and the close button ask first while something is not stored.
    this.ref?.setCloseGuard(() => this.leave.canLeave(this.store));
    listenBeforeUnload(() => this.store.unsaved());
  }

  protected async startOver(): Promise<void> {
    if (await this.leave.canLeave(this.store)) {
      this.store.reset();
    }
  }

  /** The Ask page, with this conversation when the server stored it. */
  protected async openPage(): Promise<void> {
    if (!(await this.leave.canLeave(this.store))) return;
    const id = this.store.conversationId();
    this.ref?.close();
    await this.router.navigate(['/', APP_PATH.Ask], {
      queryParams: id === null ? {} : { [ASK_CONVERSATION_PARAM]: id },
    });
  }
}
