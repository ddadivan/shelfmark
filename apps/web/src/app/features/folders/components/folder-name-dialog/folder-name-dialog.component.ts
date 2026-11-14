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
import { FOLDER_LIMIT } from '@shelfmark/contracts';
import {
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  injectDialogData,
  InputComponent,
  SelectComponent,
  NOTICE_KIND,
  NoticeComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import { FoldersStore } from '../../../../stores/folders.store';
import { buildFolderOptions } from '../../../links/utils/folder-options';
import { FOLDER_NAME_ERROR } from '../../models/folder-name-error.const';
import { FOLDER_NAME_MODE } from '../../models/folder-name-mode.const';
import type { FolderNameDialogData } from '../../models/folder-name-dialog-data.interface';

/**
 * Create or rename a folder: one name field. The dialog stays open with an error notice when
 * `submit` resolves false (the server refused a new folder) and closes on success.
 */
@Component({
  selector: 'app-folder-name-dialog',
  imports: [
    ButtonComponent,
    DialogComponent,
    FormField,
    FormRoot,
    InputComponent,
    NoticeComponent,
    SelectComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folder-name-dialog.component.html',
  styleUrl: './folder-name-dialog.component.scss',
})
export class FolderNameDialogComponent {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly FOLDER_LIMIT = FOLDER_LIMIT;

  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);
  private readonly transloco = inject(TranslocoService);
  protected readonly data = injectDialogData<FolderNameDialogData>();

  /** Ticks when the active language or its translations change, so messages re-translate. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  private readonly folders = inject(FoldersStore);

  private readonly model = signal<{ name: string; parentId: string | null }>({
    name: this.data.name,
    parentId: this.data.parentId,
  });

  /** The "Inside" field belongs to a new folder; a rename keeps the place. */
  protected readonly picksParent = this.data.mode === FOLDER_NAME_MODE.Create;
  protected readonly parentOptions = computed(() => buildFolderOptions(this.folders.entities()));
  protected readonly parentName = computed(
    () => this.folders.entities().find((folder) => folder.id === this.model().parentId)?.name,
  );

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.name, { message: () => this.text('folders.name.required') });
      validate(path.name, ({ value }): ValidationError.WithoutFieldTree | undefined =>
        value() !== '' && value().trim() === ''
          ? { kind: FOLDER_NAME_ERROR.Blank, message: this.text('folders.name.required') }
          : undefined,
      );
      maxLength(path.name, FOLDER_LIMIT.NameMax, {
        message: () => this.text('folders.name.tooLong', { max: FOLDER_LIMIT.NameMax }),
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

  protected readonly titleKey = computed(() => {
    if (this.data.mode === FOLDER_NAME_MODE.Rename) {
      return 'folders.rename.title';
    }
    return this.parentName() === undefined ? 'folders.create.title' : 'folders.create.titleIn';
  });
  protected readonly actionKey = computed(() =>
    this.data.mode === FOLDER_NAME_MODE.Rename ? 'folders.rename.action' : 'folders.create.action',
  );
  protected readonly savingKey = computed(() =>
    this.data.mode === FOLDER_NAME_MODE.Rename ? 'folders.rename.saving' : 'folders.create.saving',
  );

  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  protected cancel(): void {
    this.ref.close();
  }

  private async save(): Promise<undefined> {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.failed.set(false);
    if (await this.data.submit(this.model().name.trim(), this.model().parentId)) {
      // `saving` stays on: the button keeps its spinner while the dialog leaves.
      this.ref.close(true);
    } else {
      this.saving.set(false);
      this.failed.set(true);
    }
  }

  /** Reads `i18n` so a validation message re-translates when the language changes or loads. */
  private text(key: string, params?: Record<string, unknown>): string {
    this.i18n();
    return this.transloco.translate(key, params);
  }
}
