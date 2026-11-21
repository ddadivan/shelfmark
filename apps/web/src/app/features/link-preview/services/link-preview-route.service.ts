import { DOCUMENT, Location } from '@angular/common';
import { computed, inject, Service } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { ViewportService } from '../../../core/layout/viewport.service';
import { PREVIEW_QUERY_PARAM } from '../../../models/preview-query-param.const';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { PREVIEW_BACK_SETTLE_MS } from '../models/preview-back-settle-ms.const';
import { previewIdOfUrl } from '../utils/preview-id-of-url';
import { wantsPreview } from '../utils/wants-preview';

/** Query parameters of side by side (#386): the preview and the split never show together. */
const SIDE_BY_SIDE_PARAMS = { split: null, related: null } as const;

/**
 * Where the link preview is open (#553): `?preview=<linkId>` in the URL, so reload and Back keep
 * it. From 80em it is the split view (`split`), below it the pushed page (`pushed`). Root, so the
 * shell (the hidden tab bar) and every card or row read the same state.
 */
@Service()
export class LinkPreviewRoute {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly history = inject(DOCUMENT).defaultView?.history;
  private readonly viewport = inject(ViewportService);
  private readonly settings = inject(UserSettingsStore);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  /**
   * The history length right after this app pushed the open preview, else `null`. Close goes Back
   * only while the length is unchanged: a page the frame navigated to inside itself adds entries
   * to the same history, and Back would step the frame instead of closing. A full history (the
   * browser caps its length) hides such entries, so close also checks that Back really closed.
   */
  private pushedLength: number | null = null;

  readonly currentId = computed(() => previewIdOfUrl(this.url()));
  readonly isOpen = computed(() => this.currentId() !== null);
  readonly split = computed(() => this.isOpen() && this.viewport.wide());
  readonly pushed = computed(() => this.isOpen() && !this.viewport.wide());

  /** Opens the preview of `linkId`; switching between links replaces the history entry. */
  async open(linkId: string): Promise<void> {
    const switching = this.isOpen();
    const done = await this.router.navigate([], {
      queryParams: { [PREVIEW_QUERY_PARAM]: linkId, ...SIDE_BY_SIDE_PARAMS },
      queryParamsHandling: 'merge',
      replaceUrl: switching,
    });
    if (!switching && done) {
      this.pushedLength = this.history?.length ?? null;
    }
  }

  /** Closes the preview: Back when this app opened it (the feed keeps its scroll), else drop the parameter. */
  async close(): Promise<void> {
    const pushedLength = this.pushedLength;
    this.pushedLength = null;
    if (pushedLength !== null && this.history?.length === pushedLength) {
      this.location.back();
      await new Promise((settled) => setTimeout(settled, PREVIEW_BACK_SETTLE_MS));
      if (!this.isOpen()) {
        return;
      }
    }
    await this.router.navigate([], {
      queryParams: { [PREVIEW_QUERY_PARAM]: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Whether a click on the link `url` opens the preview instead of the link (`wantsPreview`). */
  wantsPreview(url: string, event: MouseEvent | undefined): boolean {
    const library = this.settings.libraryShown();
    return wantsPreview({
      url,
      clickAction: library.clickAction,
      newTabHosts: library.previewNewTabHosts,
      wide: this.viewport.wide(),
      previewOpen: this.split(),
      modifier: event !== undefined && (event.metaKey || event.ctrlKey),
    });
  }
}
