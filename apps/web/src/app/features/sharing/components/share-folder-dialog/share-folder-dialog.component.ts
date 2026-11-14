import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SHARE_LIMIT } from '@shelfmark/contracts';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  DialogService,
  injectDialogData,
  InputComponent,
  NOTICE_KIND,
  NoticeComponent,
  SettingsRowComponent,
  SwitchComponent,
  TOAST_KIND,
  ToastService,
  UiDialogRef,
} from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { FolderShareStore } from '../../services/folder-share.store';
import { SHARE_ERROR } from '../../models/share-error.const';
import type { ShareFolderDialogData } from '../../models/share-folder-dialog-data.interface';
import { PUBLIC_COLLECTION_ORIGIN } from '../../models/public-collection-origin.const';
import { publicCollectionUrl } from '../../utils/public-collection-url';

/**
 * Share a folder as a public collection (Share.dc board 1 without invites and roles, #276): the
 * public link switch, the link with "Copy link" (Clipboard API, the selected field as fallback),
 * and the link settings "Show my notes" and "Reset link" (with a confirmation). Every change
 * waits for the server; a failure puts the switch back and says so.
 */
@Component({
  selector: 'app-share-folder-dialog',
  imports: [
    ButtonComponent,
    DialogComponent,
    InputComponent,
    NoticeComponent,
    SettingsRowComponent,
    SwitchComponent,
    TranslocoPipe,
  ],
  providers: [FolderShareStore],
  templateUrl: './share-folder-dialog.component.html',
  styleUrl: './share-folder-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareFolderDialogComponent {
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly SHARE_ERROR = SHARE_ERROR;
  protected readonly SHARE_LIMIT = SHARE_LIMIT;

  protected readonly data = injectDialogData<ShareFolderDialogData>();
  protected readonly store = inject(FolderShareStore);
  private readonly ref = inject<UiDialogRef<void>>(UiDialogRef);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly doc = inject(DOCUMENT);
  private readonly publicOrigin = inject(PUBLIC_COLLECTION_ORIGIN);

  private readonly linkField = viewChild<InputComponent>('linkField');

  protected readonly countKey = pluralKey('sharing.dialog.count', this.data.linkCount);

  /** What the switches show; put back to the stored state when a change fails. */
  protected readonly enabledView = linkedSignal(() => this.store.enabled());
  protected readonly notesView = linkedSignal(() => this.store.showNotes());

  protected readonly url = computed(() => {
    const token = this.store.token();
    return token === null ? '' : publicCollectionUrl(this.publicOrigin, token);
  });

  /** The clipboard refused: the field is selected and a hint says how to copy. */
  protected readonly copyFailed = signal(false);

  constructor() {
    void this.store.load(this.data.folder.id);
  }

  protected async toggleEnabled(on: boolean): Promise<void> {
    this.copyFailed.set(false);
    if (!(await this.store.setEnabled(on))) {
      this.enabledView.set(this.store.enabled());
    }
  }

  protected async toggleNotes(on: boolean): Promise<void> {
    if (!(await this.store.setShowNotes(on))) {
      this.notesView.set(this.store.showNotes());
    }
  }

  protected async copy(): Promise<void> {
    const url = this.url();
    if (url === '') return;
    try {
      const clipboard = this.doc.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error('No clipboard');
      await clipboard.writeText(url);
      this.copyFailed.set(false);
      this.toasts.show({ kind: TOAST_KIND.Success, title: this.t('sharing.dialog.copied') });
    } catch {
      this.copyFailed.set(true);
      this.linkField()?.select();
    }
  }

  protected async reset(): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: this.t('sharing.reset.title'),
      message: this.t('sharing.reset.message'),
      confirmLabel: this.t('sharing.reset.confirm'),
      cancelLabel: this.t('sharing.reset.cancel'),
      destructive: true,
    });
    if (confirmed && (await this.store.reset())) {
      this.copyFailed.set(false);
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.t('sharing.reset.done'),
        detail: this.t('sharing.reset.doneDetail'),
      });
    }
  }

  protected retry(): void {
    void this.store.load(this.data.folder.id);
  }

  protected close(): void {
    this.ref.close();
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
