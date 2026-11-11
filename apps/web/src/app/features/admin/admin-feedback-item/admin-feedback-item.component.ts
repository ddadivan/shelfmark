import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, FormRoot, maxLength } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  ADMIN_FEEDBACK_LIMIT,
  FEEDBACK_STATUS,
  type FeedbackStatus,
  type AdminFeedbackItem,
  type UpdateAdminFeedbackRequest,
} from '@shelfmark/contracts';
import {
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  CHIP_VARIANT,
  ChipComponent,
  SelectComponent,
  TextareaComponent,
  type SelectOption,
} from '@shelfmark/ui';
import { feedbackSentDate } from '../../feedback/feedback-sent-date';
import { FeedbackStatusBadgeComponent } from '../../feedback/feedback-status-badge/feedback-status-badge.component';
import { FEEDBACK_KIND_COPY } from '../../feedback/models/feedback-kind-copy.const';
import { FEEDBACK_STATUS_VIEW } from '../../feedback/models/feedback-status-view.const';
import { AdminFeedbackStore } from '../admin-feedback.store';
import type { AdminFeedbackDraft } from '../models/admin-feedback-draft.interface';

function statusOf(value: string | null): FeedbackStatus | null {
  return Object.values(FEEDBACK_STATUS).find((status) => status === value) ?? null;
}

/**
 * One message in the admin inbox: who sent it and when, the text, the screenshot link, and the
 * author's controls: a status select and a reply field with Save. Save sends only what changed;
 * the store applies it at once and puts it back (with a toast) if the API refuses, in which case
 * the draft stays here so the text is not lost.
 */
@Component({
  selector: 'app-admin-feedback-item',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    ChipComponent,
    FeedbackStatusBadgeComponent,
    FormField,
    FormRoot,
    SelectComponent,
    TextareaComponent,
  ],
  templateUrl: './admin-feedback-item.component.html',
  styleUrl: './admin-feedback-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminFeedbackItemComponent {
  readonly message = input.required<AdminFeedbackItem>();

  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly CHIP_VARIANT = CHIP_VARIANT;
  protected readonly REPLY_MAX = ADMIN_FEEDBACK_LIMIT.ReplyMax;

  private readonly store = inject(AdminFeedbackStore);
  private readonly transloco = inject(TranslocoService);
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  /** The draft starts from the message and is reset only for another message, never by a rollback. */
  private readonly draft = linkedSignal<string, AdminFeedbackDraft>({
    source: () => this.message().id,
    computation: () => {
      const message = untracked(this.message);
      return { status: message.status, reply: message.reply ?? '' };
    },
  });

  protected readonly form = form(
    this.draft,
    (path) => {
      maxLength(path.reply, ADMIN_FEEDBACK_LIMIT.ReplyMax, {
        message: () =>
          this.transloco.translate('admin.feedback.replyTooLong', {
            max: ADMIN_FEEDBACK_LIMIT.ReplyMax,
          }),
      });
    },
    { submission: { action: () => this.save() } },
  );

  protected readonly saving = signal(false);

  protected readonly kindKey = computed(() => FEEDBACK_KIND_COPY[this.message().kind].labelKey);
  protected readonly sent = computed(() =>
    feedbackSentDate(this.message().createdAt, new Date(), this.transloco.getActiveLang()),
  );
  protected readonly statusOptions = computed<SelectOption[]>(() => {
    this.i18n();
    return Object.values(FEEDBACK_STATUS).map((status) => ({
      id: status,
      name: this.transloco.translate(FEEDBACK_STATUS_VIEW[status].labelKey),
    }));
  });

  /** The patch for what differs from the stored message; empty when nothing does. */
  private readonly patch = computed<UpdateAdminFeedbackRequest>(() => {
    const message = this.message();
    const { status, reply } = this.draft();
    const next = statusOf(status);
    const text = reply.trim();
    return {
      ...(next !== null && next !== message.status ? { status: next } : {}),
      ...(text !== (message.reply ?? '') ? { reply: text === '' ? null : text } : {}),
    };
  });
  protected readonly dirty = computed(() => Object.keys(this.patch()).length > 0);

  private async save(): Promise<undefined> {
    if (this.saving() || !this.dirty()) {
      return;
    }
    this.saving.set(true);
    await this.store.update(this.message().id, this.patch());
    this.saving.set(false);
  }
}
