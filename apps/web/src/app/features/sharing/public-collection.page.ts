import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SHARE_LIMIT } from '@shelfmark/contracts';
import {
  AvatarComponent,
  BUTTON_VARIANT,
  ButtonComponent,
  EmptyStateComponent,
  LogoComponent,
  NOTICE_KIND,
  NoticeComponent,
  PanelComponent,
  TOAST_KIND,
  ToastService,
} from '@shelfmark/ui';
import { AuthStore } from '../../core/auth/auth.store';
import { pluralKey } from '../../core/i18n/plural-key';
import { APP_PATH } from '../../models/app-path.const';
import { LinkCardComponent } from '../links/link-card/link-card.component';
import type { LinkCardItem } from '../links/models/link-card-item.type';
import { relativeTime } from '../../core/i18n/relative-time';
import { PublicCollectionStore } from './public-collection.store';
import { publicCollectionUrl } from './public-collection-url';

const ROBOTS = { name: 'robots', content: 'noindex, nofollow' } as const;

/**
 * A shared folder for anyone with the link (`/c/:token`, PublicCollection.dc, #276): outside the
 * app shell, no guard, the same for guests and signed-in people (only the header button differs).
 * Read-only cards (no favorite, no menu), subfolder chips, "Show more" up to 500 links, and the
 * "Keep your own links like this" invitation for guests. `noindex` while the page is open.
 */
@Component({
  selector: 'app-public-collection-page',
  imports: [
    AvatarComponent,
    ButtonComponent,
    EmptyStateComponent,
    LinkCardComponent,
    LogoComponent,
    NoticeComponent,
    PanelComponent,
    RouterLink,
    TranslocoPipe,
  ],
  providers: [PublicCollectionStore],
  templateUrl: './public-collection.page.html',
  styleUrl: './public-collection.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PublicCollectionPage {
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly SHARE_LIMIT = SHARE_LIMIT;
  protected readonly shelfHref = `/${APP_PATH.Links}`;
  protected readonly signInHref = `/${APP_PATH.SignIn}`;
  protected readonly aboutHref = `/${APP_PATH.About}`;

  /** The token from the route (`withComponentInputBinding`). */
  readonly token = input.required<string>();

  protected readonly store = inject(PublicCollectionStore);
  private readonly auth = inject(AuthStore);
  private readonly transloco = inject(TranslocoService);
  private readonly toasts = inject(ToastService);
  private readonly doc = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly signedIn = computed(() => this.auth.user() !== null);
  private readonly lang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  protected readonly cards = computed<(LinkCardItem & { id: string })[]>(() =>
    this.store
      .items()
      .map((link) => ({ ...link, tags: [], isFavorite: false, pinnedInFolderAt: null })),
  );
  protected readonly countKey = computed(() =>
    pluralKey('publicCollection.count', this.store.collection()?.linkCount ?? 0),
  );
  protected readonly updated = computed(() => {
    const collection = this.store.collection();
    return collection ? relativeTime(collection.updatedAt, Date.now(), this.lang()) : '';
  });

  constructor() {
    void this.auth.ensureLoaded();
    this.meta.updateTag(ROBOTS);
    const appName = this.title.getTitle();
    effect(() => {
      const token = this.token();
      untracked(() => void this.store.load(token));
    });
    effect(() => {
      const name = this.store.collection()?.name;
      if (name !== undefined) {
        this.title.setTitle(
          this.transloco.translate('library.pageTitle.page', { page: name, app: appName }),
        );
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.meta.removeTag(`name="${ROBOTS.name}"`);
      this.title.setTitle(appName);
    });
  }

  protected select(folder: string | null): void {
    void this.store.selectFolder(folder);
  }

  protected more(): void {
    void this.store.more();
  }

  protected retry(): void {
    void this.store.load(this.token(), this.store.folder());
  }

  protected async copy(): Promise<void> {
    const url = publicCollectionUrl(this.doc.location?.origin ?? '', this.token());
    try {
      const clipboard = this.doc.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error('No clipboard');
      await clipboard.writeText(url);
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.transloco.translate('publicCollection.copied'),
      });
    } catch {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.transloco.translate('publicCollection.copyFailed'),
        detail: this.transloco.translate('publicCollection.copyFailedDetail'),
      });
    }
  }
}
