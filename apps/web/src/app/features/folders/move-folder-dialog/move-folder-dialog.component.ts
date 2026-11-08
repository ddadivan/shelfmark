import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  injectDialogData,
  SelectComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import { FoldersStore } from '../../../stores/folders.store';
import { buildFolderOptions } from '../../links/add-link/folder-options';
import type { MoveFolderDialogData } from '../models/move-folder-dialog-data.interface';

/**
 * Pick the new parent of a folder (or the top level). The folder itself and everything below it
 * are not offered, so a cycle cannot be chosen; the store refuses one as well.
 */
@Component({
  selector: 'app-move-folder-dialog',
  imports: [ButtonComponent, DialogComponent, FormField, FormRoot, SelectComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './move-folder-dialog.component.html',
  styleUrl: './move-folder-dialog.component.scss',
})
export class MoveFolderDialogComponent {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);
  private readonly folders = inject(FoldersStore);
  protected readonly data = injectDialogData<MoveFolderDialogData>();

  private readonly model = signal<{ parentId: string | null }>({
    parentId: this.data.folder.parentId,
  });

  protected readonly form = form(this.model, () => undefined, {
    submission: { action: () => this.save() },
  });

  protected readonly options = computed(() => {
    const excluded = new Set([
      this.data.folder.id,
      ...this.folders.descendantIds(this.data.folder.id),
    ]);
    return buildFolderOptions(this.folders.entities().filter((folder) => !excluded.has(folder.id)));
  });

  protected cancel(): void {
    this.ref.close();
  }

  private save(): Promise<undefined> {
    const { parentId } = this.model();
    if (parentId !== this.data.folder.parentId) {
      this.data.submit(parentId);
    }
    this.ref.close(true);
    return Promise.resolve(undefined);
  }
}
