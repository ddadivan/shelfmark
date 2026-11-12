import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField, FormRoot, maxLength } from '@angular/forms/signals';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { FEEDBACK_LIMIT, type FeedbackScore } from '@shelfmark/contracts';
import {
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  ICON_SIZE,
  IconComponent,
  injectDialogData,
  KEYBOARD_KEY,
  NOTICE_KIND,
  NoticeComponent,
  RatingScaleComponent,
  TextareaComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { RATING_SCORES } from '../../models/rating-scores.const';
import { RATING_API } from '../../models/rating-api.const';
import { RATING_DELAY } from '../../models/rating-delay.const';
import type { RatingDialogData } from '../../models/rating-dialog-data.interface';
import { RATING_STEP } from '../../models/rating-step.const';
import type { RatingStep } from '../../models/rating-step.type';
import { RATING_THANKS_FROM_SCORE } from '../../models/rating-thanks-from-score.const';
import { isEditableTarget } from '../../utils/rating-blockers';
import { scoreForKey } from '../../utils/score-for-key';

/**
 * The rating dialog (opened by `RatingStore`), three steps in one window: the score, then
 * feedback for 1 to 7 or thanks for 8 to 10, and thanks after the feedback. The thank-you step
 * closes by itself after 4 s. The score is saved the moment it is picked; "Not now", Esc and the
 * scrim close the dialog without one and the store records the skip. Digits 1 to 9 and 0 (= 10)
 * move focus to that score on the first step (Enter picks it); focus starts on the dialog itself. While focus is not in the scale (on the dialog, or on "Not now") the first ArrowLeft / ArrowRight enters it: ArrowRight at 1, ArrowLeft at 10 (intended).
 * The step slides in 24px and fades; reduced motion shows it at once. The feedback step starts
 * with a read-only copy of the chosen score, and thanks is a centred tile with a check.
 */
@Component({
  selector: 'app-rating-dialog',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    DialogComponent,
    FormField,
    FormRoot,
    IconComponent,
    NoticeComponent,
    RatingScaleComponent,
    TextareaComponent,
  ],
  host: { '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './rating-dialog.component.html',
  styleUrl: './rating-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingDialogComponent {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly RATING_STEP = RATING_STEP;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly FEEDBACK_LIMIT = FEEDBACK_LIMIT;

  private readonly ref = inject<UiDialogRef<undefined>>(UiDialogRef);
  private readonly api = inject(RATING_API);
  private readonly data = injectDialogData<RatingDialogData>();
  private readonly injector = inject(Injector);
  /** Phone: the footer buttons span the sheet. */
  protected readonly phone = inject(ViewportService).phone;

  private readonly scale = viewChild(RatingScaleComponent);
  private readonly commentField = viewChild(TextareaComponent);
  private readonly closeButton = viewChild<ButtonComponent>('closeButton');

  protected readonly step = signal<RatingStep>(RATING_STEP.Rate);
  protected readonly score = signal<FeedbackScore | null>(null);

  private readonly transloco = inject(TranslocoService);
  /** Ticks when the language or its translations change, so the labels re-translate. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });
  /** "7 out of 10" for each button, in the order of the scale. */
  protected readonly scoreLabels = computed(() => {
    this.i18n();
    return RATING_SCORES.map((score) => this.transloco.translate('rating.scale.score', { score }));
  });
  protected readonly yourScoreLabel = computed(() => {
    this.i18n();
    return this.transloco.translate('rating.feedback.yourScore', { score: this.score() ?? '' });
  });
  protected readonly sending = signal(false);
  protected readonly failed = signal(false);
  /** The thank-you step follows a written message. */
  protected readonly wroteFeedback = signal(false);

  private readonly model = signal({ comment: '' });
  protected readonly form = form(
    this.model,
    (path) => {
      maxLength(path.comment, FEEDBACK_LIMIT.CommentMax);
    },
    { submission: { action: () => this.send() } },
  );

  protected readonly titleKey = computed(() => {
    switch (this.step()) {
      case RATING_STEP.Feedback:
        return 'rating.feedback.title';
      case RATING_STEP.Thanks:
        return 'rating.thanks.title';
      default:
        return 'rating.title';
    }
  });
  /** Nothing to send: an empty message is a skip, not a send. */
  protected readonly blank = computed(() => this.model().comment.trim() === '');

  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.closeTimer);
    });
  }

  protected close(): void {
    this.ref.close();
  }

  /** A score from the scale; anything outside it cannot come from the buttons and is ignored. */
  protected pick(score: number): void {
    const valid = RATING_SCORES.find((candidate) => candidate === score);
    if (valid !== undefined) {
      this.rate(valid);
    }
  }

  /** The score is saved at once; the answer does not wait for the request. */
  protected rate(score: FeedbackScore): void {
    if (this.step() !== RATING_STEP.Rate) {
      return;
    }
    this.score.set(score);
    this.data.scored.set(true);
    this.api.record({ milestone: this.data.milestone, score }).catch(() => {
      // Closing now records a skip instead; a feedback message sends the score again.
      this.data.scored.set(false);
    });
    if (score >= RATING_THANKS_FROM_SCORE) {
      this.goToThanks();
    } else {
      this.step.set(RATING_STEP.Feedback);
      this.focusAfterRender(() => this.commentField()?.focus());
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const scale = this.scale();
    if (
      !scale ||
      this.step() !== RATING_STEP.Rate ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      isEditableTarget(event.target)
    ) {
      return;
    }
    const digit = scoreForKey(event.key);
    if (digit !== null) {
      event.preventDefault();
      scale.focusScore(digit);
    } else if (
      scale.focusedScore() === null &&
      (event.key === KEYBOARD_KEY.ArrowRight || event.key === KEYBOARD_KEY.ArrowLeft)
    ) {
      // Focus is on the dialog itself: the first arrow enters the scale.
      event.preventDefault();
      scale.focusScore(event.key === KEYBOARD_KEY.ArrowRight ? 1 : 10);
    }
  }

  private async send(): Promise<undefined> {
    const score = this.score();
    if (this.sending() || this.blank() || score === null) {
      return;
    }
    this.sending.set(true);
    this.failed.set(false);
    try {
      await this.api.record({
        milestone: this.data.milestone,
        score,
        comment: this.model().comment.trim(),
      });
    } catch {
      this.sending.set(false);
      this.failed.set(true);
      return;
    }
    this.data.scored.set(true);
    this.sending.set(false);
    this.wroteFeedback.set(true);
    this.goToThanks();
  }

  private goToThanks(): void {
    this.step.set(RATING_STEP.Thanks);
    this.focusAfterRender(() => this.closeButton()?.focus());
    this.closeTimer = setTimeout(() => {
      this.ref.close();
    }, RATING_DELAY.ThanksClose);
  }

  /** The step that held focus left the DOM: the new step's control takes it. */
  private focusAfterRender(focus: () => void): void {
    afterNextRender(focus, { injector: this.injector });
  }
}
