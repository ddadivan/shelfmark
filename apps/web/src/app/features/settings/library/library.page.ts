import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  viewChild,
  afterNextRender,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PIN_LIMIT, TRASH_RETENTION_DAYS, type TrashRetentionDays } from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  DIALOG_SIZE,
  DialogService,
  ButtonComponent,
  NOTICE_KIND,
  NoticeComponent,
  SegmentedControlComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
  SwitchComponent,
  TOAST_KIND,
  ToastService,
  type SegmentedOption,
} from '@shelfmark/ui';
import { PinnedEditDialogComponent } from '../../pins/pinned-edit-dialog/pinned-edit-dialog.component';
import { MS_PER_DAY } from '../../../core/models/ms-per-day.const';
import { pluralKey } from '../../../core/i18n/plural-key';
import { APP_PATH } from '../../../models/app-path.const';
import { PinsStore } from '../../../stores/pins.store';
import { TrashStore } from '../../../stores/trash.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { SettingsPageHeaderComponent } from '../settings-page-header/settings-page-header.component';

/**
 * `/settings/library`: what happens to deleted items. "Keep deleted items for" (7, 30 or 90 days)
 * saves at once and rolls back with a toast when the request fails; "Trash" shows how many items
 * wait there and opens the page.
 */
@Component({
  selector: 'app-settings-library-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    NoticeComponent,
    SegmentedControlComponent,
    SettingsPageHeaderComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
    SwitchComponent,
  ],
  templateUrl: './library.page.html',
  styleUrl: './library.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LibrarySettingsPage {
  protected readonly settings = inject(UserSettingsStore);
  protected readonly trash = inject(TrashStore);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly dialogs = inject(DialogService);
  private readonly injector = inject(Injector);
  private readonly control = viewChild(SegmentedControlComponent);

  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly PIN_LIMIT = PIN_LIMIT;
  protected readonly pluralKey = pluralKey;
  protected readonly trashHref = `/${APP_PATH.Trash}`;

  protected readonly options = computed<SegmentedOption[]>(() =>
    TRASH_RETENTION_DAYS.map((days) => ({
      value: String(days),
      label: this.transloco.translate('settings.library.trash.retention.days', { count: days }),
    })),
  );

  protected readonly value = computed(() => String(this.settings.retentionDays()));

  constructor() {
    void this.settings.load();
    void this.trash.load();
    void inject(PinsStore).load();
  }

  protected retry(): void {
    void this.settings.load();
  }

  protected async setColours(on: boolean): Promise<void> {
    if (!(await this.settings.setFolderColours(on))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.transloco.translate('settings.library.folders.colours.failed'),
        detail: this.transloco.translate('settings.library.folders.colours.failedDetail'),
      });
    }
  }

  protected async editPinned(): Promise<void> {
    await this.dialogs.open(PinnedEditDialogComponent, { size: DIALOG_SIZE.Md }).result;
  }

  protected async setRetention(value: string): Promise<void> {
    const days = TRASH_RETENTION_DAYS.find((option) => String(option) === value);
    if (days === undefined) {
      return;
    }
    const previous: TrashRetentionDays = this.settings.retentionDays();
    if (days < previous && !(await this.confirmShorter(days))) {
      // The control already shows the click. Put it back after the next render: set right away,
      // the old value would be the one the control last drew and nothing would be redrawn.
      afterNextRender(() => this.control()?.value.set(String(previous)), {
        injector: this.injector,
      });
      return;
    }
    if (!(await this.settings.setTrashRetention(days))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.transloco.translate('settings.library.trash.retention.failed'),
        detail: this.transloco.translate('settings.library.trash.retention.failedDetail', {
          days: String(previous),
        }),
      });
    }
  }

  /**
   * A shorter retention applies to what is in Trash already: the nightly cleanup deletes every
   * entry older than the new value. Asks first when some entries would go; true when it may save.
   */
  private async confirmShorter(days: TrashRetentionDays): Promise<boolean> {
    const limit = Date.now() - days * MS_PER_DAY;
    const count = this.trash.items().filter((item) => Date.parse(item.deletedAt) < limit).length;
    if (count === 0) {
      return true;
    }
    const params = { count, days: String(days) };
    return this.dialogs.confirm({
      title: this.transloco.translate('settings.library.trash.shorten.title'),
      message: this.transloco.translate(
        pluralKey('settings.library.trash.shorten.message', count),
        params,
      ),
      confirmLabel: this.transloco.translate('settings.library.trash.shorten.confirm', params),
      cancelLabel: this.transloco.translate('settings.library.trash.shorten.cancel'),
      closeLabel: this.transloco.translate('settings.library.trash.shorten.close'),
      destructive: true,
    });
  }

  protected async openTrash(event: MouseEvent): Promise<void> {
    event.preventDefault();
    await this.router.navigateByUrl(this.trashHref);
  }
}
