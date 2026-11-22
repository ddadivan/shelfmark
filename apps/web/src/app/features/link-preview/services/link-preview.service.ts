import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, effect, inject, Service, signal, untracked } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  isPreviewableUrl,
  LINK_FRAMING,
  linkHost,
  toVideoEmbedUrl,
  type LinkFraming,
  type LinkResponse,
} from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { LinksStore } from '../../../stores/links.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { copyText } from '../../ai/connect/utils/copy-text';
import { LibraryFeedService } from '../../library/services/library-feed.service';
import { LINKS_API } from '../../links/models/links-api.const';
import { LinkActionsService } from '../../links/services/link-actions.service';
import { safeHref } from '../../links/utils/link-view';
import { PREVIEW_BODY_KIND } from '../models/preview-body-kind.const';
import type { PreviewBodyKind } from '../models/preview-body-kind.type';
import { PREVIEW_LIST_WIDTH } from '../models/preview-list-width.const';
import { clampListWidth } from '../utils/clamp-list-width';
import { neighbourId } from '../utils/neighbour-id';
import { LinkPreviewRoute } from './link-preview-route.service';

/** How long the copy button keeps its check after a copy. */
const COPIED_CHECK_MS = 1600;

/**
 * The open link preview of the library page (#553, ADR 0059; page-scoped through
 * `provideLibraryPage`): which link it shows (from the feed, else `GET /api/links/:id`), what the
 * body shows (frame, player or blocked), ↑ / ↓ through the feed, the toolbar actions, the list
 * width and "wider". Opening a link records an open, once per link while it stays open.
 */
@Service({ autoProvided: false })
export class LinkPreviewService {
  private readonly route = inject(LinkPreviewRoute);
  private readonly store = inject(LinksStore);
  private readonly feed = inject(LibraryFeedService);
  private readonly api = inject(LINKS_API);
  private readonly settings = inject(UserSettingsStore);
  private readonly actions = inject(LinkActionsService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly doc = inject(DOCUMENT);

  readonly currentId = this.route.currentId;
  readonly split = this.route.split;
  readonly pushed = this.route.pushed;

  /** A link the feed does not hold (a reload on a later page, another scope): read once. */
  private readonly fetched = signal<LinkResponse | null>(null);
  /** The frame check answers, per link id. */
  private readonly framing = signal<Readonly<Record<string, LinkFraming>>>({});
  /** The link whose frame sent no `load` in time. */
  private readonly timedOut = signal<string | null>(null);
  private readonly recorded = new Set<string>();

  readonly link = computed<LinkResponse | null>(() => {
    const id = this.currentId();
    if (id === null) {
      return null;
    }
    const fetched = this.fetched();
    return this.store.entityMap()[id] ?? (fetched?.id === id ? fetched : null);
  });
  readonly host = computed(() => {
    const link = this.link();
    return link ? (linkHost(link.url) ?? '') : '';
  });
  readonly href = computed(() => {
    const link = this.link();
    return link ? safeHref(link.url) : undefined;
  });
  readonly embedUrl = computed(() => {
    const link = this.link();
    return link ? toVideoEmbedUrl(link.url) : null;
  });
  /** "Always open <domain> in a new tab" is ticked. */
  readonly alwaysNewTab = computed(() =>
    this.settings.libraryShown().previewNewTabHosts.includes(this.host()),
  );
  readonly body = computed<PreviewBodyKind>(() => {
    const link = this.link();
    if (link === null) {
      return PREVIEW_BODY_KIND.Loading;
    }
    if (this.embedUrl() !== null) {
      return PREVIEW_BODY_KIND.Video;
    }
    const blocked =
      !isPreviewableUrl(link.url) ||
      this.framing()[link.id] === LINK_FRAMING.Blocked ||
      this.timedOut() === link.id;
    return blocked ? PREVIEW_BODY_KIND.Blocked : PREVIEW_BODY_KIND.Site;
  });

  private readonly ids = computed(() => this.feed.shownLinks().map((link) => link.id));
  readonly previousId = computed(() => neighbourId(this.ids(), this.currentId(), -1));
  readonly nextId = computed(() => neighbourId(this.ids(), this.currentId(), 1));

  /** "Wider preview": the list hides until toggled back (session only). */
  readonly listHidden = signal(false);
  /** True for a moment after the link was copied: the copy button shows a check (icon swap). */
  readonly copied = signal(false);
  private copiedTimer: ReturnType<typeof setTimeout> | undefined;
  readonly listWidth = signal(this.readWidth());
  /** Width of the whole split (list, handle and panel), measured by the page; `null` until then. */
  private readonly splitWidth = signal<number | null>(null);
  /** The widest list that still leaves the panel `PREVIEW_LIST_WIDTH.PanelMin` (#555). */
  readonly listMax = computed(() => {
    const split = this.splitWidth();
    return split === null
      ? PREVIEW_LIST_WIDTH.Max
      : clampListWidth(Math.max(PREVIEW_LIST_WIDTH.Min, split - PREVIEW_LIST_WIDTH.PanelMin));
  });
  /** The list width on screen: the chosen one, narrowed while the window has no room for it. */
  readonly shownListWidth = computed(() => Math.min(this.listWidth(), this.listMax()));
  readonly PREVIEW_LIST_WIDTH = PREVIEW_LIST_WIDTH;

  constructor() {
    effect(() => {
      const id = this.currentId();
      const link = this.link();
      untracked(() => this.follow(id, link));
    });
    inject(DestroyRef).onDestroy(() => {
      this.recorded.clear();
      clearTimeout(this.copiedTimer);
    });
  }

  async open(link: Pick<LinkResponse, 'id'>): Promise<void> {
    await this.route.open(link.id);
  }

  async close(): Promise<void> {
    this.listHidden.set(false);
    await this.route.close();
  }

  async go(step: -1 | 1): Promise<void> {
    const id = step < 0 ? this.previousId() : this.nextId();
    if (id !== null) {
      await this.route.open(id);
    }
  }

  /** "Open" / ↵: the link in a new tab, whatever "Open links in" says (the preview stays). */
  openInNewTab(): void {
    const link = this.link();
    const href = this.href();
    if (link && href) {
      this.actions.open(link);
      this.doc.defaultView?.open(href, '_blank', 'noopener,noreferrer');
    }
  }

  toggleFavorite(): void {
    const link = this.link();
    if (link) {
      void this.actions.toggleFavorite(link);
    }
  }

  edit(): void {
    const link = this.link();
    if (link) {
      void this.actions.edit(link);
    }
  }

  async copyLink(): Promise<void> {
    const link = this.link();
    if (!link) {
      return;
    }
    const copied = await copyText(this.doc, link.url);
    if (copied) {
      this.copied.set(true);
      clearTimeout(this.copiedTimer);
      this.copiedTimer = setTimeout(() => this.copied.set(false), COPIED_CHECK_MS);
    }
    this.toasts.show({
      kind: copied ? TOAST_KIND.Success : TOAST_KIND.Danger,
      title: this.transloco.translate(copied ? 'preview.copied' : 'preview.copyFailed'),
    });
  }

  /** Share on the phone page: the system sheet where there is one, else the copy. */
  async share(): Promise<void> {
    const link = this.link();
    const navigator = this.doc.defaultView?.navigator;
    if (!link) {
      return;
    }
    if (navigator && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: link.title, url: link.url });
      } catch {
        // Cancelled or refused: nothing to tell.
      }
      return;
    }
    await this.copyLink();
  }

  async setAlwaysNewTab(on: boolean): Promise<void> {
    const host = this.host();
    const hosts = this.settings.libraryShown().previewNewTabHosts;
    if (host === '' || hosts.includes(host) === on) {
      return;
    }
    const next = on ? [...hosts, host] : hosts.filter((h) => h !== host);
    if (!(await this.settings.setLibrary({ previewNewTabHosts: next }))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.transloco.translate('preview.saveFailed'),
      });
    }
  }

  frameTimedOut(): void {
    this.timedOut.set(this.currentId());
  }

  toggleList(): void {
    this.listHidden.update((hidden) => !hidden);
  }

  setSplitWidth(width: number): void {
    // A hidden split (0 wide, before layout) says nothing about the room.
    if (width > 0) {
      this.splitWidth.set(width);
    }
  }

  setListWidth(width: number): void {
    const next = Math.min(clampListWidth(width), this.listMax());
    this.listWidth.set(next);
    try {
      this.doc.defaultView?.localStorage.setItem(PREVIEW_LIST_WIDTH.StorageKey, String(next));
    } catch {
      // Storage blocked: the width lasts for this page.
    }
  }

  resetListWidth(): void {
    this.setListWidth(PREVIEW_LIST_WIDTH.Default);
  }

  private readWidth(): number {
    try {
      return clampListWidth(
        this.doc.defaultView?.localStorage.getItem(PREVIEW_LIST_WIDTH.StorageKey) ??
          PREVIEW_LIST_WIDTH.Default,
      );
    } catch {
      return PREVIEW_LIST_WIDTH.Default;
    }
  }

  private follow(id: string | null, link: LinkResponse | null): void {
    if (id === null) {
      this.recorded.clear();
      return;
    }
    if (link === null) {
      void this.fetch(id);
      return;
    }
    if (this.recorded.has(id)) {
      return;
    }
    this.recorded.add(id);
    this.timedOut.set(null);
    this.actions.open(link);
    if (toVideoEmbedUrl(link.url) === null && isPreviewableUrl(link.url)) {
      void this.check(id);
    }
  }

  private async fetch(id: string): Promise<void> {
    try {
      const link = await firstValueFrom(this.api.get(id));
      if (this.currentId() === id) {
        this.fetched.set(link);
      }
    } catch {
      // Gone, foreign or offline: close the preview and show the feed.
      if (this.currentId() === id) {
        await this.close();
      }
    }
  }

  private async check(id: string): Promise<void> {
    try {
      const answer = await firstValueFrom(this.api.frameCheck(id));
      this.framing.update((all) => ({ ...all, [id]: answer.framing }));
    } catch {
      // The frame and its load timeout decide (ADR 0059, point 7).
    }
  }
}
