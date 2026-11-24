import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent } from '@shelfmark/ui';
import { PushedPage } from '../../../../core/layout/pushed-page.service';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { APP_PATH } from '../../../../models/app-path.const';
import { AskComposerComponent } from '../../components/ask-composer/ask-composer.component';
import { AskConversationComponent } from '../../components/ask-conversation/ask-conversation.component';
import { AskHistoryListComponent } from '../../components/ask-history-list/ask-history-list.component';
import { ASK_CONVERSATION_PARAM } from '../../models/ask-conversation-param.const';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskConversationOpener } from '../../services/ask-conversation-opener.service';
import { AskHistorySheet } from '../../services/ask-history-sheet.service';
import { AskLeaveGuard } from '../../services/ask-leave-guard.service';
import { AskStore } from '../../services/ask.store';
import { listenBeforeUnload } from '../../utils/listen-before-unload';

/**
 * Ask your shelf as a page (Shelf 11-ask). From 64em (desktop shell): the conversation list
 * (`app-ask-history-list`, 240px) beside the conversation, the full start ("what it can do") and
 * the composer at the bottom. Below 64em (the Ask tab of the mobile shell): a tab page until the
 * first question (the compact start, the Conversations button that opens the list as a sheet, the
 * composer above the tab bar), then the conversation is pushed over the tab (`PushedPage`: Back,
 * the first question as the title, New conversation).
 *
 * Ask history (ADR 0055 amendment): `?c=<id>` names the stored conversation on screen; it is opened
 * from the server (`AskConversationOpener`) and the next question continues it. A new conversation
 * gets its `?c` once the server stored the first turn. Owns the chat (`AskStore`): leaving asks
 * first while something is not stored (`AskLeaveGuard`: the route's `askLeaveGuard`, New
 * conversation, another conversation, Back, and the browser's prompt on tab close or reload).
 * While Ask is off it leaves for Library.
 */
@Component({
  selector: 'app-ask-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    AskComposerComponent,
    AskConversationComponent,
    AskHistoryListComponent,
  ],
  providers: [AskStore, AskConversationOpener],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ask.page.html',
  styleUrl: './ask.page.scss',
})
export default class AskPage {
  protected readonly store = inject(AskStore);
  protected readonly settings = inject(AiSettingsStore);
  protected readonly viewport = inject(ViewportService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly pushed = inject(PushedPage);
  private readonly leave = inject(AskLeaveGuard);
  private readonly opener = inject(AskConversationOpener);
  private readonly sheet = inject(AskHistorySheet);
  protected readonly libraryHref = `/${APP_PATH.Library}`;

  /** The desktop page: the list beside the conversation. */
  protected readonly desktop = computed(() => !this.viewport.compact());
  /** A conversation runs: on the phone the page is pushed over its tab. */
  protected readonly chatting = computed(() => this.store.entries().length > 0);

  constructor() {
    effect(() => {
      // Ask was turned off meanwhile (another tab, Settings): nothing AI stays on screen.
      if (this.settings.loaded() && !this.settings.askOn()) {
        void this.router.navigateByUrl(this.libraryHref, { replaceUrl: true });
      }
    });
    effect(() => this.pushed.set(this.chatting() && this.viewport.compact()));
    inject(DestroyRef).onDestroy(() => this.pushed.set(false));
    listenBeforeUnload(() => this.store.unsaved());

    // `?c=<id>`: open that stored conversation (a link, a reload, a row of the list, Back).
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const wanted = params.get(ASK_CONVERSATION_PARAM);
      if (wanted !== null && wanted !== this.store.conversationId()) {
        void this.opener.open(wanted, () => this.showConversation(null));
      }
    });
    // A new conversation the server stored gets its `?c`, so a reload or a shared tab reopens it.
    let last: string | null = null;
    effect(() => {
      const current = this.store.conversationId();
      untracked(() => {
        if (current !== null && current !== last && current !== this.wanted()) {
          void this.showConversation(current, true);
        }
        last = current;
      });
    });
  }

  /** For the route's `askLeaveGuard`: asks first when something is not stored. */
  canLeave(): Promise<boolean> {
    return this.leave.canLeave(this.store);
  }

  /** New conversation (desktop list, phone head) and Back on the phone. */
  protected async startOver(): Promise<void> {
    if (!(await this.canLeave())) return;
    this.store.reset();
    await this.showConversation(null);
  }

  /** A row of the list: asks first, then routes to `?c=<id>` (the query opens it). */
  protected async openConversation(id: string): Promise<void> {
    if (id === this.store.conversationId() || !(await this.canLeave())) return;
    this.store.reset();
    await this.showConversation(id);
  }

  /** The open conversation was deleted (or all were): start over, nothing left to keep. */
  protected forget(id?: string): void {
    if (id === undefined || id === this.store.conversationId()) {
      this.store.reset();
      void this.showConversation(null, true);
    }
  }

  /** The phone's Conversations sheet. */
  protected async openSheet(): Promise<void> {
    const chosen = await this.sheet.open(this.store.conversationId(), (id) => this.forget(id));
    if (chosen !== null) await this.openConversation(chosen);
  }

  private wanted(): string | null {
    return this.route.snapshot.queryParamMap.get(ASK_CONVERSATION_PARAM);
  }

  private showConversation(id: string | null, replaceUrl = false): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [ASK_CONVERSATION_PARAM]: id },
      replaceUrl,
    });
  }
}
