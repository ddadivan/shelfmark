import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RECENT_LINKS_WINDOW_DAYS } from '@shelfmark/contracts';
import {
  ButtonComponent,
  NOTICE_KIND,
  NoticeComponent,
  TOAST_KIND,
  ToastService,
} from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { LinksStore } from '../../../../stores/links.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { RecentHistoryComponent } from '../../components/recent-history/recent-history.component';

/**
 * `/recent`: the links opened in the last 30 days. The list, with removing a link and clearing
 * the history, is `RecentHistoryComponent` (the phone sheet shows the same one); the page adds the
 * title, the count, "Pause history" / "Resume history" (an account setting: while paused, opens
 * are not recorded, and a notice says so) and the "Clear history" button.
 */
@Component({
  selector: 'app-recent-page',
  imports: [TranslocoPipe, ButtonComponent, NoticeComponent, RecentHistoryComponent],
  templateUrl: './recent.page.html',
  styleUrl: './recent.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RecentPage {
  protected readonly store = inject(LinksStore);
  protected readonly settings = inject(UserSettingsStore);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  protected readonly history = viewChild.required(RecentHistoryComponent);
  protected readonly windowDays = RECENT_LINKS_WINDOW_DAYS;
  protected readonly pluralKey = pluralKey;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly hasHistory = computed(() => this.store.recent().length > 0);

  constructor() {
    void this.settings.load();
  }

  /** Pauses or resumes at once; a failure puts the old state back and says so. */
  protected async setPaused(paused: boolean): Promise<void> {
    if (!(await this.settings.setPauseHistory(paused))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.transloco.translate(
          paused ? 'links.recent.pause.pauseFailed' : 'links.recent.pause.resumeFailed',
        ),
      });
    }
  }
}
