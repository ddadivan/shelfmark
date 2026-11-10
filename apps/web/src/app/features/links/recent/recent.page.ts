import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RECENT_LINKS_WINDOW_DAYS } from '@shelfmark/contracts';
import { ButtonComponent } from '@shelfmark/ui';
import { pluralKey } from '../../../core/i18n/plural-key';
import { LinksStore } from '../../../stores/links.store';
import { RecentHistoryComponent } from './recent-history.component';

/**
 * `/recent`: the links opened in the last 30 days. The list, with removing a link and clearing
 * the history, is `RecentHistoryComponent` (the phone sheet shows the same one); the page adds the
 * title, the count and the "Clear history" button.
 */
@Component({
  selector: 'app-recent-page',
  imports: [TranslocoPipe, ButtonComponent, RecentHistoryComponent],
  templateUrl: './recent.page.html',
  styleUrl: './recent.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RecentPage {
  protected readonly store = inject(LinksStore);
  protected readonly history = viewChild.required(RecentHistoryComponent);
  protected readonly windowDays = RECENT_LINKS_WINDOW_DAYS;
  protected readonly pluralKey = pluralKey;
  protected readonly hasHistory = computed(() => this.store.recent().length > 0);
}
