import { activeLang } from '../../../core/i18n/active-lang';
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
import {
  LINK_OPEN_TARGET,
  PIN_LIMIT,
  TRASH_RETENTION_DAYS,
  isLibrarySort,
  isLibraryView,
  isLinkOpenTarget,
  type LibrarySettings,
  type TrashRetentionDays,
} from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  DIALOG_SIZE,
  DialogService,
  ButtonComponent,
  NOTICE_KIND,
  NoticeComponent,
  SegmentedControlComponent,
  SelectComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
  SwitchComponent,
  TOAST_KIND,
  ToastService,
  type SegmentedOption,
  type SelectOption,
} from '@shelfmark/ui';
import { ViewportService } from '../../../core/layout/viewport.service';
import { FoldersStore } from '../../../stores/folders.store';
import { TagsStore } from '../../../stores/tags.store';
import { buildFolderOptions } from '../../links/add-link/folder-options';
import { FEED_SORT } from '../../links/models/feed-sort.const';
import { SORT_OPTION_KEYS } from '../../library/models/sort-option-keys.const';
import { VIEW_OPTION_KEYS } from '../../library/models/view-option-keys.const';
import { UI_VIEW } from '../../../stores/models/ui-view.const';
import { PinnedEditDialogComponent } from '../../pins/pinned-edit-dialog/pinned-edit-dialog.component';
import { MS_PER_DAY } from '../../../core/models/ms-per-day.const';
import { pluralKey } from '../../../core/i18n/plural-key';
import { APP_PATH } from '../../../models/app-path.const';
import { PinsStore } from '../../../stores/pins.store';
import { TrashStore } from '../../../stores/trash.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { SettingsPageHeaderComponent } from '../settings-page-header/settings-page-header.component';

/**
 * `/settings/library` (SetLibrary mockup, #284): Viewing (default view and sort, where links
 * open, sidebar counts) and Saving (default folder, duplicate notice, page fetch, tracking
 * parameters) apply at once, are saved on the account and roll back with a toast when the request
 * fails. Tags and folders: manage tags, folder colours, Pinned. Trash: what happens to deleted items. "Keep deleted items for" (7, 30 or 90 days)
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
    SelectComponent,
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
  private readonly folders = inject(FoldersStore);
  protected readonly tags = inject(TagsStore);
  private readonly phone = inject(ViewportService).phone;
  private readonly control = viewChild<SegmentedControlComponent>('retention');

  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly PIN_LIMIT = PIN_LIMIT;
  protected readonly pluralKey = pluralKey;
  protected readonly trashHref = `/${APP_PATH.Trash}`;

  protected readonly options = computed<SegmentedOption[]>(() => {
    // Re-runs on a language switch (`translate` itself is not reactive).
    activeLang();
    return TRASH_RETENTION_DAYS.map((days) => ({
      value: String(days),
      label: this.transloco.translate('settings.library.trash.retention.days', { count: days }),
    }));
  });

  protected readonly value = computed(() => String(this.settings.retentionDays()));

  protected readonly library = this.settings.libraryShown;

  protected readonly viewOptions = computed<SegmentedOption[]>(() => {
    // Re-runs on a language switch (`translate` itself is not reactive).
    activeLang();
    return Object.values(UI_VIEW).map((view) => ({
      value: view,
      label: this.transloco.translate(VIEW_OPTION_KEYS[view]),
    }));
  });

  protected readonly sortOptions = computed<SelectOption[]>(() => {
    // Re-runs on a language switch (`translate` itself is not reactive).
    activeLang();
    return Object.values(FEED_SORT).map((sort) => ({
      id: sort,
      name: this.transloco.translate(SORT_OPTION_KEYS[sort]),
    }));
  });

  protected readonly openOptions = computed<SegmentedOption[]>(() => {
    // Re-runs on a language switch (`translate` itself is not reactive).
    activeLang();
    return [
      {
        value: LINK_OPEN_TARGET.NewTab,
        label: this.transloco.translate('settings.library.viewing.open.newTab'),
      },
      {
        value: LINK_OPEN_TARGET.SameTab,
        label: this.transloco.translate('settings.library.viewing.open.sameTab'),
      },
    ];
  });

  protected readonly folderOptions = computed(() => buildFolderOptions(this.folders.entities()));
  /** The chosen folder while the folder list knows it; Unsorted otherwise. */
  protected readonly newLinksFolder = computed(() => {
    const id = this.library().newLinksFolderId;
    return id !== null && this.folders.entityMap()[id] !== undefined ? id : null;
  });

  constructor() {
    void this.settings.load();
    void this.trash.load();
    void inject(PinsStore).load();
    void this.folders.load();
    void this.tags.load();
  }

  protected setView(value: string): void {
    if (isLibraryView(value)) {
      void this.saveLibrary({ defaultView: value });
    }
  }

  protected setSort(value: string | null): void {
    if (isLibrarySort(value)) {
      void this.saveLibrary({ defaultSort: value });
    }
  }

  protected setOpenTarget(value: string): void {
    if (isLinkOpenTarget(value)) {
      void this.saveLibrary({ openLinksIn: value });
    }
  }

  protected setNewLinksFolder(value: string | null): void {
    void this.saveLibrary({ newLinksFolderId: value });
  }

  /** Saves a Library choice at once; a failed request puts it back and says so. */
  protected async saveLibrary(change: Partial<LibrarySettings>): Promise<void> {
    if (!(await this.settings.setLibrary(change))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.transloco.translate('settings.library.failed'),
        detail: this.transloco.translate('settings.library.failedDetail'),
      });
    }
  }

  /**
   * "Manage tags": the phone has a Tags tab; from the tablet width the sidebar's tags section does
   * the job, so the feed opens and the section's heading takes focus.
   */
  protected async manageTags(): Promise<void> {
    if (this.phone()) {
      await this.router.navigateByUrl(`/${APP_PATH.Tags}`);
      return;
    }
    if (await this.router.navigateByUrl(`/${APP_PATH.Links}`)) {
      afterNextRender(
        () => {
          const heading = globalThis.document?.getElementById('sidebar-tags-heading');
          heading?.focus();
          heading?.scrollIntoView({ block: 'nearest' });
        },
        { injector: this.injector },
      );
    }
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
