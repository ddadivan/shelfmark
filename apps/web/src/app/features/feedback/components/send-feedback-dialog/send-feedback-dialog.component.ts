import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  required,
  validate,
  type ValidationError,
} from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  FEEDBACK_MESSAGE_KIND,
  FEEDBACK_MESSAGE_LIMIT,
  FEEDBACK_SCREENSHOT_TYPES,
  type SendFeedbackRequest,
} from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  CheckboxComponent,
  DialogComponent,
  ICON_SIZE,
  IconComponent,
  NOTICE_KIND,
  NoticeComponent,
  SegmentedControlComponent,
  TextareaComponent,
  UiDialogRef,
  type SegmentedOption,
} from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { APP_VERSION } from '../../../../models/app-version.const';
import { fileSizeParts } from '../../utils/file-size-parts';
import { FeedbackSendError } from '../../utils/feedback-send-error';
import { FeedbackStore } from '../../services/feedback.store';
import { FEEDBACK_KIND_COPY } from '../../models/feedback-kind-copy.const';
import type { FeedbackFormModel } from '../../models/feedback-form-model.interface';
import { FEEDBACK_SCREENSHOT_ERROR } from '../../models/feedback-screenshot-error.const';
import type { FeedbackScreenshotAttachment } from '../../models/feedback-screenshot-attachment.interface';
import type { FeedbackScreenshotError } from '../../models/feedback-screenshot-error.type';
import { FEEDBACK_SEND_ERROR_REASON } from '../../models/feedback-send-error-reason.const';
import type { FeedbackSendErrorReason } from '../../models/feedback-send-error-reason.type';
import { readFeedbackScreenshot } from '../../utils/read-feedback-screenshot';

const BYTES_PER_MB = 1024 * 1024;

const SCREENSHOT_ERROR_KEY: Record<FeedbackScreenshotError, string> = {
  [FEEDBACK_SCREENSHOT_ERROR.Type]: 'feedback.screenshot.error.type',
  [FEEDBACK_SCREENSHOT_ERROR.Size]: 'feedback.screenshot.error.size',
  [FEEDBACK_SCREENSHOT_ERROR.Empty]: 'feedback.screenshot.error.empty',
  [FEEDBACK_SCREENSHOT_ERROR.Read]: 'feedback.screenshot.error.read',
};

const SEND_ERROR_KEY: Record<FeedbackSendErrorReason, string> = {
  [FEEDBACK_SEND_ERROR_REASON.Failed]: 'feedback.dialog.error',
  [FEEDBACK_SEND_ERROR_REASON.RateLimited]: 'feedback.dialog.rateLimited',
};

/**
 * "Send feedback": the kind (Idea, Problem, Other), the message with its 2000 counter, an optional
 * screenshot (a drop area and a "choose a file" button; type and size are checked in the browser
 * before anything is sent), "Attach browser and app version" (on by default), Cancel and Send.
 * A failed send keeps the text and shows a notice (a 429 has its own words); a sent message
 * replaces the form with a thank-you and "Done". On a phone `ui-dialog` makes it a sheet.
 */
@Component({
  selector: 'app-send-feedback-dialog',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    CheckboxComponent,
    DialogComponent,
    FormField,
    FormRoot,
    IconComponent,
    NoticeComponent,
    SegmentedControlComponent,
    TextareaComponent,
  ],
  templateUrl: './send-feedback-dialog.component.html',
  styleUrl: './send-feedback-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendFeedbackDialogComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly TEXT_MAX = FEEDBACK_MESSAGE_LIMIT.TextMax;
  protected readonly accept = FEEDBACK_SCREENSHOT_TYPES.join(',');
  protected readonly maxMb = FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes / BYTES_PER_MB;

  private readonly ref = inject<UiDialogRef<undefined>>(UiDialogRef);
  private readonly store = inject(FeedbackStore);
  private readonly transloco = inject(TranslocoService);
  private readonly injector = inject(Injector);
  protected readonly phone = inject(ViewportService).phone;

  /** Ticks when the language or its translations change, so messages re-translate. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  private readonly chooseButton = viewChild<ButtonComponent>('chooseButton');
  private readonly doneButton = viewChild<ButtonComponent>('doneButton');

  private readonly model = signal<FeedbackFormModel>({
    kind: FEEDBACK_MESSAGE_KIND.Idea,
    text: '',
    attachClient: true,
  });

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.text, { message: () => this.text('feedback.dialog.required') });
      validate(path.text, ({ value }): ValidationError.WithoutFieldTree | undefined =>
        value() !== '' && value().trim() === ''
          ? { kind: 'blank', message: this.text('feedback.dialog.required') }
          : undefined,
      );
      maxLength(path.text, FEEDBACK_MESSAGE_LIMIT.TextMax, {
        message: () =>
          this.text('feedback.dialog.tooLong', { max: FEEDBACK_MESSAGE_LIMIT.TextMax }),
      });
    },
    {
      submission: {
        action: () => this.send(),
        onInvalid: () => {
          this.form().errorSummary()[0]?.fieldTree().focusBoundControl();
        },
      },
    },
  );

  protected readonly screenshot = signal<FeedbackScreenshotAttachment | null>(null);
  protected readonly screenshotError = signal<FeedbackScreenshotError | null>(null);
  protected readonly dragging = signal(false);
  protected readonly sending = signal(false);
  protected readonly sendError = signal<FeedbackSendErrorReason | null>(null);
  protected readonly sent = signal(false);

  protected readonly kindOptions = computed<SegmentedOption[]>(() => {
    this.i18n();
    return Object.values(FEEDBACK_MESSAGE_KIND).map((kind) => ({
      value: kind,
      label: this.text(FEEDBACK_KIND_COPY[kind].labelKey),
    }));
  });
  protected readonly copy = computed(() => FEEDBACK_KIND_COPY[this.model().kind]);
  protected readonly screenshotSize = computed(() => {
    const attached = this.screenshot();
    if (attached === null) {
      return '';
    }
    const { unit, value } = fileSizeParts(attached.size);
    return this.text(`feedback.screenshot.size.${unit}`, { size: value });
  });
  protected readonly screenshotErrorText = computed(() => {
    this.i18n();
    const error = this.screenshotError();
    return error === null ? '' : this.text(SCREENSHOT_ERROR_KEY[error], { max: this.maxMb });
  });
  protected readonly sendErrorText = computed(() => {
    this.i18n();
    const error = this.sendError();
    return error === null ? '' : this.text(SEND_ERROR_KEY[error]);
  });

  protected setKind(value: string): void {
    const kind = Object.values(FEEDBACK_MESSAGE_KIND).find((known) => known === value);
    if (kind !== undefined) {
      this.form.kind().value.set(kind);
    }
  }

  protected close(): void {
    this.ref.close();
  }

  protected chooseFile(): void {
    this.fileInput().nativeElement.click();
  }

  protected async onFileChosen(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const file = input.files?.item(0);
    // Reset, so choosing the same file again after removing it fires `change`.
    input.value = '';
    if (file) {
      await this.take(file);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDragLeave(): void {
    this.dragging.set(false);
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files.item(0);
    if (file) {
      await this.take(file);
    }
  }

  protected removeScreenshot(): void {
    this.screenshot.set(null);
    this.screenshotError.set(null);
    afterNextRender(() => this.chooseButton()?.focus(), { injector: this.injector });
  }

  private async take(file: File): Promise<void> {
    const result = await readFeedbackScreenshot(file);
    if (typeof result === 'string') {
      this.screenshot.set(null);
      this.screenshotError.set(result);
    } else {
      this.screenshotError.set(null);
      this.screenshot.set(result);
    }
  }

  private async send(): Promise<undefined> {
    if (this.sending()) {
      return;
    }
    this.sending.set(true);
    this.sendError.set(null);
    const { kind, text, attachClient } = this.model();
    const attached = this.screenshot();
    const request: SendFeedbackRequest = {
      kind,
      text: text.trim(),
      ...(attached ? { screenshot: attached.upload } : {}),
      ...(attachClient
        ? {
            client: {
              appVersion: APP_VERSION,
              userAgent: navigator.userAgent.slice(0, FEEDBACK_MESSAGE_LIMIT.ClientInfoMax),
            },
          }
        : {}),
    };
    try {
      await this.store.send(request);
    } catch (error) {
      this.sending.set(false);
      this.sendError.set(
        error instanceof FeedbackSendError ? error.reason : FEEDBACK_SEND_ERROR_REASON.Failed,
      );
      return;
    }
    this.sending.set(false);
    this.sent.set(true);
    afterNextRender(() => this.doneButton()?.focus(), { injector: this.injector });
  }

  private text(key: string, params?: Record<string, unknown>): string {
    return this.transloco.translate(key, params);
  }
}
