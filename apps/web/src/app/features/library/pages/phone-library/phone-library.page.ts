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
import { pluralKey } from '../../../../core/i18n/plural-key';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { APP_PATH } from '../../../../models/app-path.const';
import { SidebarPinnedComponent } from '../../../pins/components/sidebar-pinned/sidebar-pinned.component';
import { SidebarComponent } from '../../../../shell/sidebar/sidebar.component';
import { FoldersStore } from '../../../../stores/folders.store';
import { LinksStore } from '../../../../stores/links.store';
import { TrashStore } from '../../../../stores/trash.store';
import { groupByDay } from '../../../links/utils/history-days';
import { HISTORY_DAY_KIND } from '../../../links/models/history-day-kind.const';
import { RecentSheetComponent } from '../../../links/components/recent-sheet/recent-sheet.component';
import { LibraryTileComponent } from './library-tile.component';

/**
 * The Library tab of the phone (MobileMenu): tiles for All links, Unsorted, Favorites and
 * Recently opened (a bottom sheet with the same list as `/recent`), and Trash (a page of its own), then the folder tree with its
 * menus. From the tablet width the sidebar does this job, so the page leaves for All links.
 */
@Component({
  selector: 'app-phone-library-page',
  imports: [LibraryTileComponent, SidebarComponent, SidebarPinnedComponent, TranslocoPipe],
  templateUrl: './phone-library.page.html',
  styleUrl: './phone-library.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PhoneLibraryPage {
  protected readonly folders = inject(FoldersStore);
  private readonly links = inject(LinksStore);
  private readonly trash = inject(TrashStore);
  private readonly transloco = inject(TranslocoService);
  private readonly dialogs = inject(DialogService);
  private readonly router = inject(Router);
  private readonly viewport = inject(ViewportService);

  protected readonly APP_PATH = APP_PATH;
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

  constructor() {
    void this.folders.load();
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
