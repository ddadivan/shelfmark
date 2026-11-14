import { computed, inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { FOLDER_DEFAULT_COLOUR } from '@shelfmark/contracts';
import { activeLang } from '../../../core/i18n/active-lang';
import { ViewportService } from '../../../core/layout/viewport.service';
import { FoldersStore } from '../../../stores/folders.store';
import { TagsStore } from '../../../stores/tags.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { buildFolderPickerOptions } from '../../links/utils/folder-picker-options';
import { SPLIT_TILE_ICON } from '../models/split-tile-icon.const';
import type { SplitTile } from '../models/split-tile.interface';
import type { LibraryRoute } from '../models/library-route.interface';
import { SPLIT_QUERY_PARAM } from '../models/split-query-param.const';
import { SPLIT_RIGHT_KIND } from '../models/split-right-kind.const';
import {
  leftFeedId,
  leftFeedLabel,
  leftFeedOptions,
  leftFeedRoute,
} from '../utils/left-feed-options';
import {
  canSwap,
  dropValue,
  leftDropTarget,
  parseSplitParam,
  resolveSplitTarget,
  splitParamValue,
  swapCommands,
} from '../utils/split-param';
import { LibraryFilterService } from './library-filter.service';

/**
 * The side-by-side view of the library page (#386, ADR 0044): which feed the right half shows,
 * read from `?split`, and the navigation that changes it. Open only from 80em (`wide`) and with the
 * parameter present; below that the parameter is ignored. A target the folders do not know, a
 * foreign id or the feed of the left half shows the picker, and the URL is not rewritten.
 * Page-scoped: the page provides it (`provideLibraryPage()`).
 */
@Service({ autoProvided: false })
export class SplitViewService {
  private readonly filters = inject(LibraryFilterService);
  private readonly folders = inject(FoldersStore);
  private readonly tags = inject(TagsStore);
  private readonly settings = inject(UserSettingsStore);
  private readonly viewport = inject(ViewportService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  private readonly right = computed(() => parseSplitParam(this.filters.splitParam()));

  /** The right half is on screen: wide enough and `?split` present. */
  readonly open = computed(
    () => this.viewport.wide() && this.right().kind !== SPLIT_RIGHT_KIND.Closed,
  );
  /** The right feed: a folder id, `null` for Unsorted, `undefined` while it shows the picker (or is closed). */
  readonly rightTarget = computed(() =>
    this.open()
      ? resolveSplitTarget(
          this.right(),
          this.folders.entityMap(),
          this.folders.loaded(),
          this.filters.filter(),
        )
      : undefined,
  );
  /** The folder of the right feed, once the folder list has it. */
  readonly rightFolder = computed(() => {
    const target = this.rightTarget();
    return typeof target === 'string' ? this.folders.entityMap()[target] : undefined;
  });
  /** The URL names a folder and the folder list is still loading: not the picker yet. */
  readonly resolving = computed(
    () => this.open() && this.right().kind === SPLIT_RIGHT_KIND.Folder && !this.folders.loaded(),
  );
  /** `data-link-drop-folder` of the left half: its folder id, `unsorted`, or `null` for any other list. */
  readonly leftDropValue = computed(() => dropValue(leftDropTarget(this.filters.filter())));
  /** `data-link-drop-folder` of the right half: its folder id, `unsorted`, or `null` for the picker. */
  readonly rightDropValue = computed(() => dropValue(this.rightTarget()));
  /** The halves can trade places (the left one is a folder or Unsorted, the right one shows a target). */
  readonly canSwap = computed(
    () => this.open() && canSwap(this.filters.filter(), this.rightTarget()),
  );

  /** Options of the left picker: the lists, the folders and the tags. */
  readonly leftOptions = computed(() => {
    activeLang();
    return leftFeedOptions(
      this.folders.entities(),
      this.tags.entities(),
      {
        all: this.transloco.translate(`library.scope.${LINKS_SCOPE.All}`),
        favorites: this.transloco.translate(`library.scope.${LINKS_SCOPE.Favorites}`),
      },
      (colour) => this.settings.shownColour(colour),
    );
  });
  /** Options of the right picker: the folders (Unsorted is its `null` row). */
  readonly rightOptions = computed(() =>
    buildFolderPickerOptions(this.folders.entities(), (colour) =>
      this.settings.shownColour(colour),
    ),
  );
  /** The option the left picker shows. */
  readonly leftValue = computed(() => leftFeedId(this.filters.filter()));
  /** The option the right picker shows; `undefined` while there is none. */
  readonly rightValue = this.rightTarget;
  /** Rows of the left picker that are the right feed ("On the right"). */
  readonly leftCurrentIds = computed<readonly (string | null)[]>(() => {
    const target = this.rightTarget();
    return target === undefined ? [] : [target];
  });
  /** Rows of the right picker that are the left feed ("On the left"). */
  readonly rightCurrentIds = computed<readonly (string | null)[]>(() => {
    const target = leftDropTarget(this.filters.filter());
    return target === undefined ? [] : [target];
  });
  /** The tile of the right feed (the bulk bar and the picker): its folder's colour and icon, `inbox` for Unsorted. */
  readonly rightTile = computed<SplitTile>(() => {
    const folder = this.rightFolder();
    return folder
      ? { colour: this.settings.shownColour(folder.colour), icon: folder.icon }
      : { colour: FOLDER_DEFAULT_COLOUR, icon: SPLIT_TILE_ICON.Unsorted };
  });
  /** The tile of the left feed: its folder's colour and icon, or the glyph of the list or tag. */
  readonly leftTile = computed<SplitTile>(() => {
    const filter = this.filters.filter();
    const folder = this.filters.folder();
    if (folder) {
      return { colour: this.settings.shownColour(folder.colour), icon: folder.icon };
    }
    const colour = FOLDER_DEFAULT_COLOUR;
    switch (filter.scope) {
      case LINKS_SCOPE.Unsorted:
        return { colour, icon: SPLIT_TILE_ICON.Unsorted };
      case LINKS_SCOPE.Favorites:
        return { colour, icon: SPLIT_TILE_ICON.Favorites };
      default:
        return {
          colour,
          icon: filter.tags && filter.tags.length > 0 ? SPLIT_TILE_ICON.Tag : SPLIT_TILE_ICON.All,
        };
    }
  });
  /** Name of what the left half shows. */
  readonly leftLabel = computed(() => {
    activeLang();
    return leftFeedLabel(this.filters.filter(), this.folders.entityMap(), (key, params) =>
      this.transloco.translate(key, params),
    );
  });
  /** Name of what the right half shows (empty for the picker). */
  readonly rightLabel = computed(() => {
    activeLang();
    const target = this.rightTarget();
    if (target === null) {
      return this.transloco.translate(`library.scope.${LINKS_SCOPE.Unsorted}`);
    }
    return this.rightFolder()?.name ?? '';
  });

  // The picker was opened by the "Side by side" button: it takes the focus its button had, once.
  private pickerFocus = false;
  // The split was closed: the "Side by side" button, which appears now, takes the focus, once.
  private openerFocus = false;

  /** Whether the right half's picker takes the focus as it appears; read once, then reset. */
  takePickerFocus(): boolean {
    const wanted = this.pickerFocus;
    this.pickerFocus = false;
    return wanted;
  }

  /** Whether the "Side by side" button takes the focus as it appears; read once, then reset. */
  takeOpenerFocus(): boolean {
    const wanted = this.openerFocus;
    this.openerFocus = false;
    return wanted;
  }

  /** Opens the right half with the picker (the "Side by side" button). Only from 80em. */
  async openSplit(): Promise<void> {
    if (this.viewport.wide() && !this.open()) {
      this.pickerFocus = true;
      await this.setSplit('', false);
    }
  }

  /** Closes the right half. */
  async close(): Promise<void> {
    this.pickerFocus = false;
    this.openerFocus = true;
    await this.router.navigate([], {
      queryParams: { [SPLIT_QUERY_PARAM]: null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * The right half shows `target` (a folder id, `null` for Unsorted). A choice made while the half
   * shows the picker (the empty `?split=`, and also a foreign or same-as-left id, which show it
   * too) replaces the entry, so Back closes the split instead of returning to a picker; later
   * changes are new entries.
   */
  async chooseRight(target: string | null): Promise<void> {
    await this.setSplit(splitParamValue(target), this.rightTarget() === undefined);
  }

  /** The left half shows another feed; the right half stays, the left filters are dropped. */
  async chooseLeft(id: string | null): Promise<void> {
    const route = leftFeedRoute(id);
    await this.go(route, splitParamValue(this.rightTarget()));
  }

  /** The halves trade places: the right feed becomes the page, the left one the right half. */
  async swap(): Promise<void> {
    const route = swapCommands(this.filters.filter(), this.rightTarget());
    if (route) {
      await this.router.navigate([...route.commands], { queryParams: route.queryParams });
    }
  }

  private async go(route: LibraryRoute, split: string): Promise<void> {
    await this.router.navigate([...route.commands], {
      queryParams: { ...route.queryParams, [SPLIT_QUERY_PARAM]: split },
    });
  }

  private async setSplit(value: string, replaceUrl: boolean): Promise<void> {
    await this.router.navigate([], {
      queryParams: { [SPLIT_QUERY_PARAM]: value },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}
