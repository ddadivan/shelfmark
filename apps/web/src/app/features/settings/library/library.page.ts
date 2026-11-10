import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TRASH_RETENTION_DAYS, type TrashRetentionDays } from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  ButtonComponent,
  NOTICE_KIND,
  NoticeComponent,
  SegmentedControlComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
  TOAST_KIND,
  ToastService,
  type SegmentedOption,
} from '@shelfmark/ui';
import { pluralKey } from '../../../core/i18n/plural-key';
import { APP_PATH } from '../../../models/app-path.const';
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

  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly NOTICE_KIND = NOTICE_KIND;
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
  }

  protected retry(): void {
    void this.settings.load();
  }

  protected async setRetention(value: string): Promise<void> {
    const days = TRASH_RETENTION_DAYS.find((option) => String(option) === value);
    if (days === undefined) {
      return;
    }
    const previous: TrashRetentionDays = this.settings.retentionDays();
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

  protected async openTrash(event: MouseEvent): Promise<void> {
    event.preventDefault();
    await this.router.navigateByUrl(this.trashHref);
  }
}
