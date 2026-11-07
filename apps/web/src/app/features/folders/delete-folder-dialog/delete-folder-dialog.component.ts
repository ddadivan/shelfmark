import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { FOLDER_DELETE_MODE, type FolderDeleteMode } from '@shelfmark/contracts';
import {
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  injectDialogData,
  NOTICE_KIND,
  NoticeComponent,
  RadioGroupComponent,
  UiDialogRef,
  type RadioOption,
} from '@shelfmark/ui';
import { combineLatest, map } from 'rxjs';
import type { DeleteFolderDialogData } from '../models/delete-folder-dialog-data.interface';
import { pluralKey } from '../plural-key';

/**
 * Delete a folder and its subfolders. When the subtree holds links the user chooses what happens
 * to them: move to Unsorted (the safe default, listed first) or delete them too. The dialog
 * waits for the server and stays open with an error when the request fails.
 */
@Component({
  selector: 'app-delete-folder-dialog',
  imports: [
    ButtonComponent,
    DialogComponent,
    FormField,
    FormRoot,
    NoticeComponent,
    RadioGroupComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delete-folder-dialog.component.html',
  styleUrl: './delete-folder-dialog.component.scss',
})
export class DeleteFolderDialogComponent {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;

  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);
  private readonly transloco = inject(TranslocoService);
  protected readonly data = injectDialogData<DeleteFolderDialogData>();

  private readonly model = signal<{ mode: string }>({ mode: FOLDER_DELETE_MODE.MoveToUnsorted });

  protected readonly form = form(this.model, () => undefined, {
    submission: { action: () => this.save() },
  });

  protected readonly hasLinks = computed(() => this.data.linkCount > 0);
  protected readonly deletesLinks = computed(
    () => this.model().mode === FOLDER_DELETE_MODE.DeleteLinks,
  );

  protected readonly textKey = computed(() => {
    const { linkCount, subfolderCount } = this.data;
    if (linkCount === 0) {
      return subfolderCount === 0 ? 'folders.delete.textEmpty' : 'folders.delete.textNoLinks';
    }
    return subfolderCount === 0 ? 'folders.delete.textLinks' : 'folders.delete.textBoth';
  });

  /** The counted nouns ("34 links", "2 subfolders"), translated with their plural form. */
  private readonly nouns = toSignal(
    combineLatest([
      this.transloco.selectTranslate(pluralKey('folders.delete.links', this.data.linkCount), {
        count: this.data.linkCount,
      }),
      this.transloco.selectTranslate(
        pluralKey('folders.delete.subfolders', this.data.subfolderCount),
        { count: this.data.subfolderCount },
      ),
    ]).pipe(map(([links, subfolders]) => ({ links, subfolders }))),
  );
  protected readonly textParams = computed(() => this.nouns() ?? { links: '', subfolders: '' });

  private readonly optionTexts = toSignal(
    combineLatest([
      this.transloco.selectTranslate('folders.delete.move.title'),
      this.transloco.selectTranslate(pluralKey('folders.delete.move.desc', this.data.linkCount), {
        count: this.data.linkCount,
      }),
      this.transloco.selectTranslate('folders.delete.remove.title'),
      this.transloco.selectTranslate('folders.delete.remove.desc'),
    ]).pipe(
      map(([moveTitle, moveDesc, removeTitle, removeDesc]) => ({
        moveTitle,
        moveDesc,
        removeTitle,
        removeDesc,
      })),
    ),
  );

  /** The safe option first. */
  protected readonly options = computed<RadioOption[]>(() => {
    const texts = this.optionTexts();
    return texts
      ? [
          {
            value: FOLDER_DELETE_MODE.MoveToUnsorted,
            title: texts.moveTitle,
            description: texts.moveDesc,
          },
          {
            value: FOLDER_DELETE_MODE.DeleteLinks,
            title: texts.removeTitle,
            description: texts.removeDesc,
          },
        ]
      : [];
  });

  protected readonly actionKey = computed(() =>
    this.hasLinks() && this.deletesLinks()
      ? pluralKey('folders.delete.actionWithLinks', this.data.linkCount)
      : 'folders.delete.action',
  );

  protected readonly deleting = signal(false);
  protected readonly failed = signal(false);

  protected cancel(): void {
    this.ref.close();
  }

  private async save(): Promise<undefined> {
    if (this.deleting()) {
      return;
    }
    const mode: FolderDeleteMode =
      this.hasLinks() && this.deletesLinks()
        ? FOLDER_DELETE_MODE.DeleteLinks
        : FOLDER_DELETE_MODE.MoveToUnsorted;
    this.deleting.set(true);
    this.failed.set(false);
    if (await this.data.submit(mode)) {
      // `deleting` stays on: the button keeps its spinner while the dialog leaves.
      this.ref.close(true);
    } else {
      this.deleting.set(false);
      this.failed.set(true);
    }
  }
}
