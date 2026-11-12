import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  LINK_KIND,
  LINK_LIMIT,
  type CreateLinkRequest,
  type LinkResponse,
  type UpdateLinkRequest,
} from '@shelfmark/contracts';
import { isLinkKind } from '../../utils/link-kind';
import {
  ButtonComponent,
  CheckboxComponent,
  DialogComponent,
  FaviconComponent,
  injectDialogData,
  KEYBOARD_KEY,
  InputComponent,
  NoticeComponent,
  NOTICE_KIND,
  SelectComponent,
  SkeletonComponent,
  TagInputComponent,
  TextareaComponent,
  UiDialogRef,
  BUTTON_VARIANT,
  BUTTON_TYPE,
  INPUT_TYPE,
  SKELETON_SHAPE,
  type TagSuggestion,
} from '@shelfmark/ui';
import { firstValueFrom, type Observable } from 'rxjs';
import { FoldersStore } from '../../../../stores/folders.store';
import { TagsStore } from '../../../../stores/tags.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { isMacPlatform } from '../../../search/utils/is-mac-platform';
import { normalizeTagNames } from '../../../tags/utils/normalize-tag-names';
import { ADD_LINK_ACTION } from '../../models/add-link-action.const';
import type { AddLinkDialogData } from '../../models/add-link-dialog-data.interface';
import type { AddLinkSaved } from '../../models/add-link-saved.interface';
import type { AddLinkResult } from '../../models/add-link-result.type';
import { LINKS_API } from '../../models/links-api.const';
import { PREVIEW_STATE } from '../../models/preview-state.const';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { PasteManyListComponent } from '../paste-many/paste-many-list.component';
import { AddLinkFormService } from '../../services/add-link-form.service';
import { AddLinkPreviewService } from '../../services/add-link-preview.service';
import { AddSeveralLinksService } from '../../services/add-several-links.service';
import { buildFolderOptions } from '../../utils/folder-options';
import { saveErrorKey } from '../../utils/save-error-key';

/**
 * Content of the add-link dialog (`openAddLinkDialog()`): paste a URL, the preview fills the
 * title, choose folder, tags and note, save. Built on Signal Forms; limits and URL rule mirror
 * the contract. The preview shows text only (title, description, favicon fallback): images wait
 * for ADR 0027.
 *
 * The preview is an `rxResource` keyed by the valid URL, so a new URL cancels the old request
 * (the debounce is the `timer` inside the stream). Its result autofills the title until the user
 * edits it. A failed preview is not an error for saving: the link keeps its address as the title.
 *
 * Several links pasted into the address field (or handed over as `data.text` by ⌘V in the
 * library) turn the dialog into the paste-many list (`PasteManyListComponent`), which keeps the
 * folder and tags chosen so far and closes the dialog itself.
 *
 * Edit mode (`data.link`): the form is prefilled, the preview runs only after the URL changed and
 * serves the duplicate check alone (the link itself is not a duplicate), saving sends the changed
 * fields only, and Delete hands the link back to the caller (confirm and Undo live there).
 */
@Component({
  selector: 'app-add-link-dialog',
  imports: [
    ButtonComponent,
    CheckboxComponent,
    DialogComponent,
    FaviconComponent,
    FormField,
    FormRoot,
    InputComponent,
    NoticeComponent,
    PasteManyListComponent,
    SelectComponent,
    SkeletonComponent,
    TagInputComponent,
    TextareaComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AddLinkFormService, AddSeveralLinksService, AddLinkPreviewService],
  templateUrl: './add-link-dialog.component.html',
  styleUrl: './add-link-dialog.component.scss',
})
export class AddLinkDialogComponent {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly INPUT_TYPE = INPUT_TYPE;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly PREVIEW_STATE = PREVIEW_STATE;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly LINK_LIMIT = LINK_LIMIT;
  /** Cmd (macOS) or Ctrl: the key of the "save" shortcut shown in the footer. */
  protected readonly mac = isMacPlatform();

  /** The phone sheet has no Cancel in add mode and no shortcut hint: not rendered there. */
  protected readonly phone = inject(ViewportService).phone;
  private readonly formState = inject(AddLinkFormService);
  private readonly linksApi = inject(LINKS_API);
  private readonly folders = inject(FoldersStore);
  private readonly tagStore = inject(TagsStore);
  private readonly ref = inject<UiDialogRef<AddLinkResult>>(UiDialogRef);
  private readonly transloco = inject(TranslocoService);
  private readonly localeService = inject(LocaleService);
  private readonly data = injectDialogData<AddLinkDialogData>();
  private readonly settings = inject(UserSettingsStore);
  /** Settings › Library › Saving: the default folder and whether pages are fetched. */
  private readonly library = this.settings.libraryShown;

  /** The link being edited; `undefined` when adding. */
  protected readonly original = this.formState.original;
  protected readonly editing = this.formState.editing;

  private readonly severalLinks = inject(AddSeveralLinksService);
  protected readonly pasted = this.severalLinks.pasted;
  protected readonly several = this.severalLinks.several;
  protected readonly severalForm = this.severalLinks.severalForm;

  /** Edit mode: the "Type" select (video, article, shopping, other). */
  protected readonly kindOptions = computed(() => {
    this.formState.i18n();
    return Object.values(LINK_KIND).map((kind) => ({
      id: kind,
      name: this.transloco.translate(`links.kindOption.${kind}`),
    }));
  });

  protected readonly form = this.formState.form;
  private readonly model = this.formState.model;

  private readonly previewService = inject(AddLinkPreviewService);
  protected readonly fetchPages = this.previewService.fetchPages;
  protected readonly previewState = this.previewService.previewState;
  protected readonly shownState = this.previewService.shownState;
  protected readonly noPreview = this.previewService.noPreview;
  protected readonly previewData = this.previewService.previewData;
  protected readonly previewHost = this.previewService.previewHost;
  protected readonly duplicate = this.previewService.duplicate;

  protected readonly folderOptions = computed(() => buildFolderOptions(this.folders.entities()));
  protected readonly tagSuggestions = computed<TagSuggestion[]>(() => {
    this.formState.i18n();
    return this.tagStore.entities().map((tag) => ({
      name: tag.name,
      countLabel: this.transloco.translate(pluralKey('tags.count', tag.linkCount), {
        count: tag.linkCount,
      }),
    }));
  });

  /** "Saved X, last opened Y" under the form (edit mode). */
  protected readonly meta = computed(() => {
    this.formState.i18n();
    const link = this.original;
    if (!link) {
      return null;
    }
    const now = Date.now();
    const created = this.localeService.formatRelative(link.createdAt, now);
    return link.lastOpenedAt === null
      ? this.transloco.translate('links.edit.metaNever', { created })
      : this.transloco.translate('links.edit.meta', {
          created,
          opened: this.localeService.formatRelative(link.lastOpenedAt, now),
        });
  });

  constructor() {
    // Usually loaded by the sidebar already; the options fill in when the list arrives.
    void this.folders.load();
    void this.tagStore.load();
    this.formState.onSubmit(() => this.save());
  }

  protected readonly saving = signal(false);
  /** Translation key of why the last save failed; `null` while nothing failed. */
  protected readonly saveError = signal<string | null>(null);

  protected openExisting(): void {
    const existing = this.duplicate();
    if (existing) {
      this.ref.close({ action: ADD_LINK_ACTION.OpenExisting, existing });
    }
  }

  protected onUrlPaste(event: ClipboardEvent): void {
    this.severalLinks.onUrlPaste(event);
  }

  protected showSeveral(): void {
    this.severalLinks.showSeveral();
  }

  protected showSingle(): void {
    this.severalLinks.showSingle();
  }

  protected onSeveralKeydown(event: KeyboardEvent): void {
    this.severalLinks.onSeveralKeydown(event);
  }

  /** Cmd / Ctrl + Enter saves from any field (Enter alone in a text field submits as before). */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === KEYBOARD_KEY.Enter && (event.metaKey || event.ctrlKey) && !this.saving()) {
      event.preventDefault();
      (event.currentTarget as HTMLFormElement).requestSubmit();
    }
  }

  protected cancel(): void {
    this.ref.close();
  }

  protected requestDelete(): void {
    if (this.original) {
      this.ref.close({ action: ADD_LINK_ACTION.Delete, link: this.original });
    }
  }

  private async save(): Promise<undefined> {
    if (this.saving()) {
      return;
    }
    const value = this.model();
    const title = value.title.trim();
    const note = value.note.trim();
    const tags = [...normalizeTagNames(value.tags)];
    let request$: Observable<LinkResponse>;
    if (this.original) {
      const changes = this.changes();
      if (Object.keys(changes).length === 0) {
        this.ref.close();
        return;
      }
      request$ = this.linksApi.update(this.original.id, changes);
    } else {
      const fetched = this.previewService.fetchedPreview();
      const payload: CreateLinkRequest = {
        url: value.url.trim(),
        ...(title && { title }),
        ...(note && { note }),
        ...(value.folderId !== null && { folderId: value.folderId }),
        ...(tags.length > 0 && { tags }),
        ...(fetched?.faviconUrl && { faviconUrl: fetched.faviconUrl }),
        ...(fetched?.imageUrl && { imageUrl: fetched.imageUrl }),
        // The kind the server read from the page (og:type and host); without it the server uses the host.
        ...(fetched && { kind: fetched.kind }),
      };
      request$ = this.linksApi.create({
        ...payload,
        idempotencyKey: this.keyFor(this.fingerprint(payload)),
      });
    }
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const pending = firstValueFrom(request$).then((link): AddLinkSaved => ({
        action: ADD_LINK_ACTION.Saved,
        link,
      }));
      // Kept for the service: the caller gets the result even if the dialog was dismissed meanwhile.
      this.data.session.saving = pending.catch(() => undefined);
      const saved = await pending;
      // `saving` stays on: the button keeps its spinner while the dialog leaves.
      this.ref.close(saved);
    } catch (error) {
      this.saving.set(false);
      this.saveError.set(saveErrorKey(error));
    }
  }

  /**
   * What the user entered, as text: url, note, folder, tags and the title only when typed. The
   * autofilled title and the preview hints are sent but left out, so a late preview does not
   * renew the key of a retry.
   */
  private fingerprint(payload: CreateLinkRequest): string {
    return JSON.stringify({
      url: payload.url,
      note: payload.note,
      folderId: payload.folderId,
      tags: payload.tags,
      title: this.form.title().dirty() ? payload.title : undefined,
    });
  }

  /**
   * The idempotency key of this save. A retry of the same payload reuses the key (the server
   * replays it); a changed payload needs a new one, because the server ignores the payload of a
   * replayed key.
   */
  private keyFor(fingerprint: string): string {
    const session = this.data.session;
    if (
      session.idempotencyKey === null ||
      (session.sentFingerprint !== null && session.sentFingerprint !== fingerprint)
    ) {
      session.idempotencyKey = globalThis.crypto.randomUUID();
    }
    session.sentFingerprint = fingerprint;
    return session.idempotencyKey;
  }

  /** Edit mode: only the fields that differ from the saved link. */
  private changes(): UpdateLinkRequest {
    const link = this.original;
    const value = this.model();
    const changes: UpdateLinkRequest = {};
    if (!link) {
      return changes;
    }
    const url = value.url.trim();
    const title = value.title.trim();
    const note = value.note.trim();
    const tags = [...normalizeTagNames(value.tags)];
    if (url !== link.url) {
      changes.url = url;
    }
    if (title !== link.title) {
      changes.title = title;
    }
    if (note !== (link.note ?? '')) {
      changes.note = note === '' ? null : note;
    }
    if (value.folderId !== link.folderId) {
      changes.folderId = value.folderId;
    }
    if (value.isFavorite !== link.isFavorite) {
      changes.isFavorite = value.isFavorite;
    }
    if (value.kind !== link.kind && isLinkKind(value.kind)) {
      changes.kind = value.kind;
    }
    if (tags.length !== link.tags.length || tags.some((tag, index) => tag !== link.tags[index])) {
      changes.tags = tags;
    }
    return changes;
  }
}
