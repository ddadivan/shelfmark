import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { activeLang } from '../../../../core/i18n/active-lang';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { APP_PATH } from '../../../../models/app-path.const';
import { SidebarPinnedComponent } from '../../../pins/components/sidebar-pinned/sidebar-pinned.component';
import { SidebarComponent } from '../../../../shell/sidebar/sidebar.component';
import { FoldersStore } from '../../../../stores/folders.store';
import { LinksStore } from '../../../../stores/links.store';
import { RediscoverStore } from '../../../rediscover/services/rediscover.store';
import { TrashStore } from '../../../../stores/trash.store';
import { RemindersStore } from '../../../../stores/reminders.store';
import { groupByDay } from '../../../links/utils/history-days';
import { HISTORY_DAY_KIND } from '../../../links/models/history-day-kind.const';
import { RecentSheetComponent } from '../../../links/components/recent-sheet/recent-sheet.component';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { SidebarTagsComponent } from '../../../tags/components/sidebar-tags/sidebar-tags.component';
import { LibraryTileComponent } from './library-tile.component';
import { LINKS_SCOPE_LABEL_KEY } from '../../../links/models/links-scope-label-key.const';

/**
 * The Library tab of the phone (MobileMenu): Pinned, the folder tree with its menus (#512), then
 * tiles for All links, Unsorted, Favorites, Recently opened (a bottom sheet with the same list as
 * `/recent`), Reminders and Trash (a page of its own), and the tags while Ask has their tab (#499). From the tablet width the sidebar does this job, so the page leaves for All links.
 */
@Component({
  selector: 'app-phone-library-page',
  imports: [
    LibraryTileComponent,
    SidebarComponent,
    SidebarPinnedComponent,
    SidebarTagsComponent,
    TranslocoPipe,
  ],
  templateUrl: './phone-library.page.html',
  styleUrl: './phone-library.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PhoneLibraryPage {
  protected readonly folders = inject(FoldersStore);
  protected readonly LINKS_SCOPE_LABEL_KEY = LINKS_SCOPE_LABEL_KEY;
  private readonly links = inject(LinksStore);
  private readonly trash = inject(TrashStore);
  private readonly reminders = inject(RemindersStore);
  private readonly rediscover = inject(RediscoverStore);
  private readonly transloco = inject(TranslocoService);
  private readonly dialogs = inject(DialogService);
  private readonly router = inject(Router);
  private readonly viewport = inject(ViewportService);

  protected readonly APP_PATH = APP_PATH;
  /** Ask has the Tags place in the tab bar: the tags section shows under the folders. */
  protected readonly askTab = inject(AiSettingsStore).askOn;
  protected readonly counts = computed(() =>
    this.folders.loaded() ? this.folders.counts() : null,
  );

  /** "5 items" once Trash has loaded and is not empty. */
  protected readonly trashMeta = computed(() => {
    const total = this.trash.total();
    return this.trash.loaded() && total > 0
      ? this.transloco.translate(pluralKey('library.phone.trashCount', total), { count: total })
      : undefined;
  });

  /** "2 due" while reminders are due (#275). */
  protected readonly remindersMeta = computed(() => {
    const due = this.reminders.dueCount();
    return due > 0
      ? this.transloco.translate(pluralKey('reminders.dueShort', due), { count: due })
      : undefined;
  });

  private readonly now = signal(new Date());
  /** Links opened today, once the history has loaded. */
  protected readonly openedToday = computed(() => {
    if (!this.links.recentLoaded()) {
      return undefined;
    }
    const today = groupByDay(this.links.recent(), this.now()).find(
      (day) => day.kind === HISTORY_DAY_KIND.Today,
    );
    return today?.links.length ?? 0;
  });

  /** How many forgotten links wait (Recently opened › Forgotten, #512). */
  protected readonly forgotten = this.rediscover.count;

  /** "5 forgotten" while some wait, else "2 today" once the history has loaded. */
  protected readonly recentMeta = computed(() => {
    activeLang(); // re-translate on a language switch
    const waiting = this.forgotten();
    if (waiting > 0) {
      return this.transloco.translate(pluralKey('rediscover.note', waiting), { count: waiting });
    }
    const today = this.openedToday();
    return today
      ? this.transloco.translate('library.phone.openedToday', { count: today })
      : undefined;
  });

  constructor() {
    void this.folders.load();
    void this.rediscover.load();
    void this.links.loadRecent();
    void this.trash.load();
    effect(() => {
      if (!this.viewport.compact()) {
        void this.router.navigateByUrl(`/${APP_PATH.Links}`, { replaceUrl: true });
      }
    });
  }

  protected openRecent(): void {
    void this.dialogs.open(RecentSheetComponent, { size: DIALOG_SIZE.Md });
  }
}
