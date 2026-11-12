import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { FEEDBACK_STATUS, type FeedbackStatus } from '@shelfmark/contracts';
import {
  ButtonComponent,
  EmptyStateComponent,
  LoadMoreComponent,
  NOTICE_KIND,
  NoticeComponent,
  PanelComponent,
  SelectComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
  type SelectOption,
} from '@shelfmark/ui';
import { FEEDBACK_LOAD_STATE } from '../../../feedback/models/feedback-load-state.const';
import { FEEDBACK_STATUS_VIEW } from '../../../feedback/models/feedback-status-view.const';
import { SettingsPageHeaderComponent } from '../../../settings/components/settings-page-header/settings-page-header.component';
import { AdminFeedbackItemComponent } from '../../components/admin-feedback-item/admin-feedback-item.component';
import { AdminFeedbackStore } from '../../services/admin-feedback.store';

/**
 * `/admin/feedback`, the author's inbox: every message with who sent it, a status filter, and per
 * message a status select and a reply field. Only the author gets here (`adminOnly`); the list
 * loads on entry, pages of 20 with "Load more".
 */
@Component({
  selector: 'app-admin-feedback-page',
  imports: [
    TranslocoPipe,
    AdminFeedbackItemComponent,
    ButtonComponent,
    EmptyStateComponent,
    LoadMoreComponent,
    NoticeComponent,
    PanelComponent,
    SelectComponent,
    SettingsPageHeaderComponent,
    SkeletonComponent,
  ],
  templateUrl: './admin-feedback.page.html',
  styleUrl: './admin-feedback.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AdminFeedbackPage {
  protected readonly store = inject(AdminFeedbackStore);
  private readonly transloco = inject(TranslocoService);
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly LOAD = FEEDBACK_LOAD_STATE;

  protected readonly filterOptions = computed<SelectOption[]>(() => {
    this.i18n();
    return Object.values(FEEDBACK_STATUS).map((status) => ({
      id: status,
      name: this.transloco.translate(FEEDBACK_STATUS_VIEW[status].labelKey),
    }));
  });

  constructor() {
    void this.store.load();
  }

  protected setFilter(value: string | null): void {
    const status: FeedbackStatus | null =
      Object.values(FEEDBACK_STATUS).find((known) => known === value) ?? null;
    void this.store.setFilter(status);
  }

  protected retry(): void {
    void this.store.load();
  }

  protected more(): void {
    void this.store.loadMore();
  }
}
