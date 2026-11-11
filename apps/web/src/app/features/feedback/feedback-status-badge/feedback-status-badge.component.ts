import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { FeedbackStatus } from '@shelfmark/contracts';
import { ChipComponent } from '@shelfmark/ui';
import { FEEDBACK_STATUS_VIEW } from '../models/feedback-status-view.const';

/**
 * The status of a feedback message as a badge. Words always carry the status (Done also has a
 * check); Planned, In progress and Done use the accent tone, Received and Not planned the quiet
 * one. Built on `ui-chip` (there is no `ui-badge` in `libs/ui` yet).
 */
@Component({
  selector: 'app-feedback-status-badge',
  imports: [TranslocoPipe, ChipComponent],
  templateUrl: './feedback-status-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedbackStatusBadgeComponent {
  readonly status = input.required<FeedbackStatus>();

  protected readonly view = computed(() => FEEDBACK_STATUS_VIEW[this.status()]);
}
