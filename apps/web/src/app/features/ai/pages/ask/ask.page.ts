import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent } from '@shelfmark/ui';
import { PushedPage } from '../../../../core/layout/pushed-page.service';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { APP_PATH } from '../../../../models/app-path.const';
import { AskComposerComponent } from '../../components/ask-composer/ask-composer.component';
import { AskConversationComponent } from '../../components/ask-conversation/ask-conversation.component';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskPanelService } from '../../services/ask-panel.service';
import { AskStore } from '../../services/ask.store';

/**
 * Ask your shelf on the phone and tablet (Shelf 11-ask "Ask on the phone"): the Ask tab of the
 * mobile shell. Before the first question it is a tab page (top bar and tab bar stay): the
 * compact start with one example per kind and the composer above the tab bar. Once something was
 * asked the conversation is pushed over the tab (`PushedPage`: the shell hides both bars): Back
 * and the first question as the title on top, the composer at the bottom. Back starts over (the
 * conversation lives only in memory, ADR 0055). Owns the conversation (`AskStore`): leaving
 * forgets it and stops a stream, as closing the desktop panel does. From 64em the header has the
 * Ask button, so the page hands over to the panel; while Ask is off it leaves for Library.
 */
@Component({
  selector: 'app-ask-page',
  imports: [TranslocoPipe, ButtonComponent, AskComposerComponent, AskConversationComponent],
  providers: [AskStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ask.page.html',
  styleUrl: './ask.page.scss',
})
export default class AskPage {
  protected readonly store = inject(AskStore);
  protected readonly settings = inject(AiSettingsStore);
  protected readonly viewport = inject(ViewportService);
  private readonly router = inject(Router);
  private readonly panel = inject(AskPanelService);
  private readonly pushed = inject(PushedPage);
  protected readonly libraryHref = `/${APP_PATH.Library}`;

  /** A conversation runs: the page is pushed over its tab. */
  protected readonly chatting = computed(() => this.store.entries().length > 0);

  constructor() {
    effect(() => {
      // Ask was turned off meanwhile (another tab, Settings): nothing AI stays on screen.
      if (this.settings.loaded() && !this.settings.askOn()) {
        void this.router.navigateByUrl(this.libraryHref, { replaceUrl: true });
        return;
      }
      if (!this.viewport.compact()) {
        void this.router.navigateByUrl(`/${APP_PATH.Links}`, { replaceUrl: true });
        this.panel.open();
      }
    });
    effect(() => this.pushed.set(this.chatting()));
    inject(DestroyRef).onDestroy(() => this.pushed.set(false));
  }
}
