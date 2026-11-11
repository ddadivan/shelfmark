import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PIN_KIND, type FolderResponse, type LinkResponse } from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  ButtonComponent,
  DialogComponent,
  FaviconComponent,
  FolderIconComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import { PinsStore } from '../../../stores/pins.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { siteLetter } from '../../links/link-view';
import { PinActionsService } from '../pin-actions.service';

/**
 * "Edit pinned" (Settings > Library): the Pinned section of the sidebar as a list with "Move up",
 * "Move down" and "Unpin" per item, for people who cannot or do not want to drag. Changes apply
 * at once, like in the sidebar.
 */
@Component({
  selector: 'app-pinned-edit-dialog',
  imports: [ButtonComponent, DialogComponent, FaviconComponent, FolderIconComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pinned-edit-dialog.component.html',
  styleUrl: './pinned-edit-dialog.component.scss',
})
export class PinnedEditDialogComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly PIN_KIND = PIN_KIND;
  protected readonly pins = inject(PinsStore);
  protected readonly settings = inject(UserSettingsStore);
  private readonly actions = inject(PinActionsService);
  private readonly ref = inject<UiDialogRef<void>>(UiDialogRef);
  private readonly transloco = inject(TranslocoService);

  protected name(folder: FolderResponse | null, link: LinkResponse | null): string {
    return folder?.name ?? link?.title ?? '';
  }

  protected letter(link: LinkResponse): string {
    return siteLetter(link.url);
  }

  protected label(key: string, name: string): string {
    return this.transloco.translate(key, { name });
  }

  protected move(index: number, delta: number): void {
    void this.actions.move(index, index + delta);
  }

  protected unpin(folder: FolderResponse | null, link: LinkResponse | null): void {
    if (folder) {
      void this.actions.unpinFolder(folder);
    } else if (link) {
      void this.actions.unpinLink(link);
    }
  }

  protected close(): void {
    this.ref.close();
  }
}
