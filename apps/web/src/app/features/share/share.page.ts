import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, FormRoot, maxLength } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LINK_LIMIT } from '@shelfmark/contracts';
import {
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  FaviconComponent,
  InputComponent,
  LOGO_VARIANT,
  LogoComponent,
  NOTICE_KIND,
  NoticeComponent,
  SelectComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
} from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { ViewportService } from '../../core/layout/viewport.service';
import { APP_PATH } from '../../models/app-path.const';
import { FoldersStore } from '../../stores/folders.store';
import { UserSettingsStore } from '../../stores/user-settings.store';
import { buildFolderOptions } from '../links/components/add-link/folder-options';
import { displayHost, urlWithoutScheme } from '../links/components/add-link/http-url';
import { LinkActionsService } from '../links/services/link-actions.service';
import { LINKS_API } from '../links/models/links-api.const';
import { PREVIEW_STATE } from '../links/models/preview-state.const';
import type { PreviewState } from '../links/models/preview-state.type';
import { extractSharedLink } from './utils/extract-shared-link';
import { SHARE_STATE } from './models/share-state.const';
import type { ShareState } from './models/share-state.type';
import type { ShareFormModel } from './models/share-form-model.interface';

/**
 * Target of the Android Web Share Target (`/share?url=&text=&title=`, signed-in only). The query
 * is untrusted: `extractSharedLink` keeps the first http(s) URL and nothing else, and everything
 * is shown as text. A usable URL opens the quick save form (preview, folder, note); anything else
 * shows an error and saves nothing. Saving is the regular `POST /api/links`, then the library
 * with the usual toast. The preview failing does not block saving.
 */
@Component({
  selector: 'app-share-page',
  imports: [
    ButtonComponent,
    FaviconComponent,
    FormField,
    FormRoot,
    InputComponent,
    LogoComponent,
    NoticeComponent,
    SelectComponent,
    SkeletonComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './share.page.html',
  styleUrl: './share.page.scss',
})
export default class SharePage {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly LOGO_VARIANT = LOGO_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly PREVIEW_STATE = PREVIEW_STATE;
  protected readonly SHARE_STATE = SHARE_STATE;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;

  /** The grip of the bottom sheet exists on a phone only. */
  protected readonly phone = inject(ViewportService).phone;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly linksApi = inject(LINKS_API);
  private readonly folders = inject(FoldersStore);
  private readonly settings = inject(UserSettingsStore);
  private readonly actions = inject(LinkActionsService);
  private readonly transloco = inject(TranslocoService);

  // The query of the manifest's `share_target`. Untyped values on purpose: a repeated parameter
  // arrives as an array and the extractor ignores it. (Not `input()`: a `title` input would need
  // an alias, which the lint rules ban.)
  private readonly query = toSignal(this.route.queryParams, {
    initialValue: this.route.snapshot.queryParams,
  });

  private readonly shared = computed(() => {
    const { url, text, title } = this.query();
    return extractSharedLink({ url, text, title });
  });

  protected readonly sharedUrl = computed(() => this.shared().url);
  protected readonly state = computed<ShareState>(() =>
    this.sharedUrl() === null ? SHARE_STATE.Invalid : SHARE_STATE.Form,
  );
  /** The address shown and saved; empty only in the error state. */
  protected readonly address = computed(() => this.sharedUrl() ?? '');

  private readonly preview = rxResource({
    params: () => this.sharedUrl() ?? undefined,
    stream: ({ params: url }) => this.linksApi.preview(url),
  });

  protected readonly previewState = computed<PreviewState>(() => {
    if (this.sharedUrl() === null) {
      return PREVIEW_STATE.Idle;
    }
    if (this.preview.error()) {
      return PREVIEW_STATE.Failed;
    }
    return this.preview.hasValue() ? PREVIEW_STATE.Ready : PREVIEW_STATE.Loading;
  });

  private readonly previewData = computed(() =>
    this.previewState() === PREVIEW_STATE.Ready && this.preview.hasValue()
      ? this.preview.value().preview
      : null,
  );

  /** The title hint while loading, then the page's own title; the address if neither exists. */
  protected readonly title = computed(() => {
    const hint = this.shared().titleHint;
    const fromPage = this.previewData()?.title ?? '';
    const known = fromPage || hint;
    if (known !== '') {
      return known.slice(0, LINK_LIMIT.TitleMax);
    }
    return this.previewState() === PREVIEW_STATE.Loading
      ? ''
      : urlWithoutScheme(this.address()).slice(0, LINK_LIMIT.TitleMax);
  });

  protected readonly description = computed(() => this.previewData()?.description ?? '');
  protected readonly host = computed(() => displayHost(this.address()));
  protected readonly duplicate = computed(() =>
    this.preview.hasValue() ? this.preview.value().duplicate : null,
  );

  protected readonly folderOptions = computed(() => buildFolderOptions(this.folders.entities()));

  private readonly model = signal<ShareFormModel>({ folderId: null, note: '' });
  protected readonly saving = signal(false);
  protected readonly saveFailed = signal(false);

  protected readonly form = form(
    this.model,
    (path) => {
      maxLength(path.note, LINK_LIMIT.NoteMax, {
        message: () =>
          this.transloco.translate('links.add.note.tooLong', { max: LINK_LIMIT.NoteMax }),
      });
    },
    { submission: { action: () => this.save() } },
  );

  constructor() {
    void this.folders.load();
    // Settings › Library › New links go to: the folder the form starts with, unless already picked.
    void this.settings.load().then(() => {
      const folderId = this.settings.libraryShown().newLinksFolderId;
      if (folderId !== null && !this.form.folderId().dirty()) {
        this.model.update((model) => ({ ...model, folderId }));
      }
    });
  }

  /** Back to the library, saving nothing. */
  protected leave(): void {
    void this.router.navigateByUrl(`/${APP_PATH.Links}`);
  }

  private async save(): Promise<undefined> {
    const url = this.sharedUrl();
    if (url === null || this.saving()) {
      return;
    }
    const { folderId, note } = this.model();
    const title = this.title().trim();
    const trimmedNote = note.trim();
    this.saving.set(true);
    this.saveFailed.set(false);
    try {
      const link = await firstValueFrom(
        this.linksApi.create({
          url,
          ...(title && { title }),
          ...(trimmedNote && { note: trimmedNote }),
          ...(folderId !== null && { folderId }),
        }),
      );
      this.actions.noteSaved(link);
      // `saving` stays on: the button keeps its spinner while the page leaves.
      await this.router.navigateByUrl(`/${APP_PATH.Links}`);
    } catch {
      this.saving.set(false);
      this.saveFailed.set(true);
    }
  }
}
