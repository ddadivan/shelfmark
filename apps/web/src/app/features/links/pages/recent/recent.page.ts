import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RECENT_LINKS_WINDOW_DAYS } from '@shelfmark/contracts';
import {
  ButtonComponent,
  NOTICE_KIND,
  NoticeComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
  TOAST_KIND,
  ToastService,
} from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { LinksStore } from '../../../../stores/links.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { ForgottenListComponent } from '../../../rediscover/components/forgotten-list/forgotten-list.component';
import { RediscoverStore } from '../../../rediscover/services/rediscover.store';
import { RecentHistoryComponent } from '../../components/recent-history/recent-history.component';
import { RecentViewSwitchComponent } from '../../components/recent-view-switch/recent-view-switch.component';
import { RECENT_VIEW } from '../../models/recent-view.const';
import type { RecentView } from '../../models/recent-view.type';
import { parseRecentView } from '../../utils/recent-view';

/**
 * `/recent`: the links opened in the last 30 days. The list, with removing a link and clearing
 * the history, is `RecentHistoryComponent` (the phone sheet shows the same one); the page adds the
 * "Opened · Forgotten" switch (in the URL as `?show=forgotten`, so Back and a link work; Forgotten
 * is the Rediscover list, #512), the title, the count, "Pause history" / "Resume history" (an account setting: while paused, opens
 * are not recorded, and a notice says so) and the "Clear history" button.
 */
@Component({
  selector: 'app-recent-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    ForgottenListComponent,
    NoticeComponent,
    RecentHistoryComponent,
    RecentViewSwitchComponent,
    SkeletonComponent,
  ],
  templateUrl: './recent.page.html',
  styleUrl: './recent.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RecentPage {
  protected readonly store = inject(LinksStore);
  protected readonly settings = inject(UserSettingsStore);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  protected readonly rediscover = inject(RediscoverStore);
  private readonly router = inject(Router);
  /** From the query (`?show=forgotten`): see `parseRecentView`. */
  readonly show = input<unknown>();
  protected readonly view = computed(() => parseRecentView(this.show()));
  protected readonly RECENT_VIEW = RECENT_VIEW;
  protected readonly history = viewChild(RecentHistoryComponent);
  protected readonly windowDays = RECENT_LINKS_WINDOW_DAYS;
  protected readonly pluralKey = pluralKey;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly hasHistory = computed(() => this.store.recent().length > 0);

  constructor() {
    void this.settings.load();
    void this.rediscover.load();
  }

  /** The switch writes the view into the URL (one history entry per choice). */
  protected async setView(view: RecentView): Promise<void> {
    await this.router.navigate([], {
      queryParams: { show: view === RECENT_VIEW.Forgotten ? view : null },
      queryParamsHandling: 'merge',
    });
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
