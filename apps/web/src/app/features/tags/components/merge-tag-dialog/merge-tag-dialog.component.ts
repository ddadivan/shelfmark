import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  injectDialogData,
  NOTICE_KIND,
  NoticeComponent,
  type SelectOption,
  SelectComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import { TagsStore } from '../../../../stores/tags.store';
import type { MergeTagDialogData } from '../../models/merge-tag-dialog-data.interface';

/** Pick the tag to merge into: its links move over and the source tag is deleted. */
@Component({
  selector: 'app-merge-tag-dialog',
  imports: [
    ButtonComponent,
    DialogComponent,
    FormField,
    FormRoot,
    NoticeComponent,
    SelectComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './merge-tag-dialog.component.html',
  styleUrl: './merge-tag-dialog.component.scss',
})
export class MergeTagDialogComponent {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;

  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);
  private readonly tags = inject(TagsStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly data = injectDialogData<MergeTagDialogData>();

  /** Ticks when the active language or its translations change, so messages re-translate. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  private readonly model = signal<{ targetId: string | null }>({ targetId: null });

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.targetId, { message: () => this.text('tags.merge.required') });
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

  protected readonly options = computed<SelectOption[]>(() =>
    this.tags
      .entities()
      .filter((tag) => tag.id !== this.data.tag.id)
      .map((tag) => ({ id: tag.id, name: tag.name })),
  );

  protected readonly merging = signal(false);
  protected readonly failed = signal(false);

  protected cancel(): void {
    this.ref.close();
  }

  private async save(): Promise<undefined> {
    const { targetId } = this.model();
    if (this.merging() || targetId === null) {
      return;
    }
    this.merging.set(true);
    this.failed.set(false);
    if (await this.data.submit(targetId)) {
      // `merging` stays on: the button keeps its spinner while the dialog leaves.
      this.ref.close(true);
    } else {
      this.merging.set(false);
      this.failed.set(true);
    }
  }

  /** Reads `i18n` so a validation message re-translates when the language changes or loads. */
  private text(key: string): string {
    this.i18n();
    return this.transloco.translate(key);
  }
}
