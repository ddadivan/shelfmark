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
import { FoldersStore } from '../../../../stores/folders.store';
import { buildFolderOptions } from '../add-link/folder-options';
import type { MoveLinkDialogData } from '../../models/move-link-dialog-data.interface';

/** "Move to folder…": pick a folder for a link, or Unsorted (the empty value). */
@Component({
  selector: 'app-move-link-dialog',
  imports: [ButtonComponent, DialogComponent, FormField, FormRoot, SelectComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './move-link-dialog.component.html',
  styleUrl: './move-link-dialog.component.scss',
})
export class MoveLinkDialogComponent {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);
  private readonly folders = inject(FoldersStore);
  protected readonly data = injectDialogData<MoveLinkDialogData>();

  private readonly model = signal<{ folderId: string | null }>({
    folderId: this.data.folderId,
  });

  protected readonly form = form(this.model, () => undefined, {
    submission: { action: () => this.save() },
  });

  protected readonly options = computed(() => buildFolderOptions(this.folders.entities()));

  protected cancel(): void {
    this.ref.close();
  }

  private save(): Promise<undefined> {
    const { folderId } = this.model();
    if (this.data.submitUnchanged === true || folderId !== this.data.folderId) {
      this.data.submit(folderId);
    }
    this.ref.close(true);
    return Promise.resolve(undefined);
  }
}
