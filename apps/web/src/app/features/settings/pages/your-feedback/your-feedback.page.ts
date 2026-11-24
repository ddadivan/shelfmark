import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { FeedbackMessage } from '@shelfmark/contracts';
import {
  AVATAR_SIZE,
  AvatarComponent,
  ButtonComponent,
  EmptyStateComponent,
  NOTICE_KIND,
  NoticeComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
} from '@shelfmark/ui';
import { feedbackSentDate } from '../../../feedback/utils/feedback-sent-date';
import { FeedbackDialogService } from '../../../feedback/services/feedback-dialog.service';
import { FeedbackStatusBadgeComponent } from '../../../feedback/components/feedback-status-badge/feedback-status-badge.component';
import { FeedbackStore } from '../../../feedback/services/feedback.store';
import { FEEDBACK_KIND_COPY } from '../../../feedback/models/feedback-kind-copy.const';
import { FEEDBACK_LOAD_STATE } from '../../../feedback/models/feedback-load-state.const';
import { SettingsPageHeaderComponent } from '../../components/settings-page-header/settings-page-header.component';

/**
 * `/settings/feedback` (Shelf 15-tools "Your feedback"): the user's messages, newest first, one
 * card each (status, kind and the day it was sent, the text, the reply on a card inside), then
 * "Send feedback" (the same dialog as the account menu). Loading, empty and error states are handled here; the list reloads on entry.
 */
@Component({
  selector: 'app-settings-feedback-page',
  imports: [
    TranslocoPipe,
    AvatarComponent,
    ButtonComponent,
    EmptyStateComponent,
    FeedbackStatusBadgeComponent,
    NoticeComponent,
    SettingsPageHeaderComponent,
    SkeletonComponent,
  ],
  templateUrl: './your-feedback.page.html',
  styleUrl: './your-feedback.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class YourFeedbackPage {
  protected readonly store = inject(FeedbackStore);
  private readonly dialog = inject(FeedbackDialogService);
  private readonly transloco = inject(TranslocoService);

  protected readonly AVATAR_SIZE = AVATAR_SIZE;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly LOAD = FEEDBACK_LOAD_STATE;

  /** The messages with their translated kind key and the sent date, ready for the template. */
  protected readonly rows = computed(() => {
    const now = new Date();
    const locale = this.transloco.getActiveLang();
    return this.store.items().map((message: FeedbackMessage) => ({
      message,
      kindKey: FEEDBACK_KIND_COPY[message.kind].labelKey,
      sent: feedbackSentDate(message.createdAt, now, locale),
    }));
  });

  constructor() {
    void this.store.load();
  }

  protected send(): void {
    this.dialog.open();
  }

  protected retry(): void {
    void this.store.load();
  }
}
