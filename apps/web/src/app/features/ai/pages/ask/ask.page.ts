import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent } from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { APP_PATH } from '../../../../models/app-path.const';
import { AskComposerComponent } from '../../components/ask-composer/ask-composer.component';
import { AskConversationComponent } from '../../components/ask-conversation/ask-conversation.component';
import { AskHeadingComponent } from '../../components/ask-heading/ask-heading.component';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskPanelService } from '../../services/ask-panel.service';
import { AskStore } from '../../services/ask.store';

/**
 * Ask your shelf full screen (`MobileAiMore` 2–3): the Ask tab of the mobile shell, a pushed page
 * (the shell hides the tab bar). Back on top (the previous page, else Library), the title with the
 * spark and the questions left, "New question" once something was asked, the conversation and the
 * composer in a glass bar at the bottom. Owns the conversation (`AskStore`): leaving forgets it
 * and stops a stream, as closing the desktop panel does. From 64em the header has the Ask button,
 * so the page hands over to the panel; while Ask is off it leaves for Library.
 */
@Component({
  selector: 'app-ask-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    AskHeadingComponent,
    AskComposerComponent,
    AskConversationComponent,
  ],
  providers: [AskStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ask.page.html',
  styleUrl: './ask.page.scss',
})
export default class AskPage {
  protected readonly store = inject(AskStore);
  protected readonly settings = inject(AiSettingsStore);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly viewport = inject(ViewportService);
  private readonly panel = inject(AskPanelService);
  protected readonly libraryHref = `/${APP_PATH.Library}`;

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
  }

  /** Back to where Ask was opened from; Library when the page was the first one of the visit. */
  protected async back(event?: MouseEvent): Promise<void> {
    event?.preventDefault();
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
      return;
    }
    await this.router.navigateByUrl(this.libraryHref);
  }
}
