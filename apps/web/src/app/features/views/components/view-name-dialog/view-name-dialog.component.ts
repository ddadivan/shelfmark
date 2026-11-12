import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import { SAVED_VIEW_LIMIT } from '@shelfmark/contracts';
import {
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  injectDialogData,
  InputComponent,
  NOTICE_KIND,
  NoticeComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import type { ViewNameDialogData } from '../../models/view-name-dialog-data.interface';
import { VIEW_NAME_ERROR } from '../../models/view-name-error.const';
import { VIEW_NAME_MODE } from '../../models/view-name-mode.const';

/**
 * Names a saved view: "Save this view" (the current filter) or "Rename". One field; the dialog
 * stays open with an error notice when `submit` resolves an error key and closes on success.
 */
@Component({
  selector: 'app-view-name-dialog',
  imports: [
    ButtonComponent,
    DialogComponent,
    FormField,
    FormRoot,
    InputComponent,
    NoticeComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './view-name-dialog.component.html',
  styleUrl: './view-name-dialog.component.scss',
})
export class ViewNameDialogComponent {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;

  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);
  private readonly transloco = inject(TranslocoService);
  protected readonly data = injectDialogData<ViewNameDialogData>();
  /** Ticks when the active language or its translations change, so messages re-translate. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  private readonly model = signal({ name: this.data.name });
  protected readonly form = form(
    this.model,
    (path) => {
      required(path.name, { message: () => this.text('views.name.required') });
      validate(path.name, ({ value }): ValidationError.WithoutFieldTree | undefined =>
        value() !== '' && value().trim() === ''
          ? { kind: VIEW_NAME_ERROR.Blank, message: this.text('views.name.required') }
          : undefined,
      );
      maxLength(path.name, SAVED_VIEW_LIMIT.NameMax, {
        message: () => this.text('views.name.tooLong', { max: SAVED_VIEW_LIMIT.NameMax }),
      });
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: () => {
          this.form().errorSummary()[0]?.fieldTree().focusBoundControl();
        },
      },
    },
  );

  private readonly renaming = this.data.mode === VIEW_NAME_MODE.Rename;
  protected readonly titleKey = this.renaming ? 'views.rename.title' : 'views.create.title';
  protected readonly actionKey = this.renaming ? 'views.rename.action' : 'views.create.action';
  protected readonly savingKey = this.renaming ? 'views.rename.saving' : 'views.create.saving';
  protected readonly saving = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly failed = computed(() => this.errorKey() !== null);

  protected cancel(): void {
    this.ref.close();
  }

  private async save(): Promise<undefined> {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.errorKey.set(null);
    const error = await this.data.submit(this.model().name.trim());
    if (error === null) {
      // `saving` stays on: the button keeps its spinner while the dialog leaves.
      this.ref.close(true);
    } else {
      this.saving.set(false);
      this.errorKey.set(error);
    }
  }

  /** Reads `i18n` so a validation message re-translates when the language changes or loads. */
  private text(key: string, params?: Record<string, unknown>): string {
    this.i18n();
    return this.transloco.translate(key, params);
  }
}
