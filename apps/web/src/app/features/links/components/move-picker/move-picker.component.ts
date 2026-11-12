import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { injectDialogData, PickerListComponent, SheetComponent, UiDialogRef } from '@shelfmark/ui';
import { FoldersStore } from '../../../../stores/folders.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import type { MovePickerData } from '../../models/move-picker-data.interface';
import { buildFolderPickerOptions } from '../../utils/folder-picker-options';

/**
 * "Move to folder…": a folder picker with a search field, shown as a bottom sheet below 64em
 * (centred 560px on a tablet) and as a centred dialog on desktop. Choosing a folder (or Unsorted)
 * moves the link or links at once and closes; the caller shows the "Moved to …" toast with Undo.
 * Used by the card and row menus and the bulk bar through `DialogService.open`.
 */
@Component({
  selector: 'app-move-picker',
  imports: [PickerListComponent, SheetComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './move-picker.component.html',
  styleUrl: './move-picker.component.scss',
})
export class MovePickerComponent {
  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);
  private readonly folders = inject(FoldersStore);
  private readonly settings = inject(UserSettingsStore);
  protected readonly data = injectDialogData<MovePickerData>();

  protected readonly options = computed(() =>
    buildFolderPickerOptions(this.folders.entities(), (colour) =>
      this.settings.shownColour(colour),
    ),
  );

  protected choose(folderId: string | null): void {
    this.data.submit(folderId);
    this.ref.close(true);
  }
}
