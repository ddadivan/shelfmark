import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  required,
  validate,
  type ValidationError,
} from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  isHttpUrl,
  LINK_LIMIT,
  type CreateLinkRequest,
  type LinkDuplicate,
  type LinkPreview,
  type LinkResponse,
  type UpdateLinkRequest,
} from '@shelfmark/contracts';
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
import { firstValueFrom, switchMap, tap, timer, type Observable } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { TagsStore } from '../../../stores/tags.store';
import { pluralKey } from '../../../core/i18n/plural-key';
import { isMacPlatform } from '../../search/is-mac-platform';
import { normalizeTagNames } from '../../tags/normalize-tag-names';
import { ADD_LINK_ACTION } from '../models/add-link-action.const';
import type { AddLinkDialogData } from '../models/add-link-dialog-data.interface';
import type { AddLinkSaved } from '../models/add-link-saved.interface';
import type { AddLinkFormModel } from '../models/add-link-form-model.interface';
import type { AddLinkResult } from '../models/add-link-result.type';
import { LINKS_API } from '../models/links-api.const';
import { PREVIEW_STATE } from '../models/preview-state.const';
import type { PreviewState } from '../models/preview-state.type';
import { relativeTime } from '../relative-time';
import { buildFolderOptions } from './folder-options';
import { displayHost, urlWithoutScheme } from './http-url';
import { saveErrorKey } from './save-error-key';

/** Wait after the last keystroke before the preview is requested (a paste is instant to the eye). */
const PREVIEW_DEBOUNCE_MS = 350;

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
    SelectComponent,
    SkeletonComponent,
    TagInputComponent,
    TextareaComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  private readonly linksApi = inject(LINKS_API);
  private readonly folders = inject(FoldersStore);
  private readonly tagStore = inject(TagsStore);
  private readonly ref = inject<UiDialogRef<AddLinkResult>>(UiDialogRef);
  private readonly transloco = inject(TranslocoService);
  private readonly data = injectDialogData<AddLinkDialogData>();

  /** Ticks when the active language or its translations change, so messages re-translate. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  /** The link being edited; `undefined` when adding. */
  protected readonly original = this.data.link;
  protected readonly editing = this.original !== undefined;

  private readonly model = signal<AddLinkFormModel>({
    url: this.original?.url ?? '',
    title: this.original?.title ?? '',
    folderId: this.original ? this.original.folderId : (this.data.folderId ?? null),
    tags: [...normalizeTagNames(this.original?.tags ?? [])],
    note: this.original?.note ?? '',
    isFavorite: this.original?.isFavorite ?? false,
  });

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.url, { message: () => this.text('links.add.url.required') });
      maxLength(path.url, LINK_LIMIT.UrlMax, {
        message: () => this.text('links.add.url.tooLong', { max: LINK_LIMIT.UrlMax }),
      });
      validate(path.url, ({ value }): ValidationError.WithoutFieldTree | undefined => {
        const url = value().trim();
        return url === '' || isHttpUrl(url)
          ? undefined
          : { kind: 'url', message: this.text('links.add.url.invalid') };
      });
      if (this.editing) {
        // Adding may leave the title empty (the preview fills it); an edit must not lose it.
        validate(path.title, ({ value }): ValidationError.WithoutFieldTree | undefined =>
          value().trim() === ''
            ? { kind: 'required', message: this.text('links.add.titleField.required') }
            : undefined,
        );
      }
      maxLength(path.title, LINK_LIMIT.TitleMax, {
        message: () => this.text('links.add.titleField.tooLong', { max: LINK_LIMIT.TitleMax }),
      });
      maxLength(path.note, LINK_LIMIT.NoteMax, {
        message: () => this.text('links.add.note.tooLong', { max: LINK_LIMIT.NoteMax }),
      });
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: () => {
          this.form().errorSummary()[0]?.fieldTree().focusBoundControl();
        },
      },
    },
  );

  /** The typed URL once it is a valid http(s) URL; the preview follows it. */
  private readonly previewUrl = computed(() => {
    const url = this.form.url();
    const value = url.value().trim();
    // Editing: the saved address needs no preview, only a changed one is checked for duplicates.
    return url.valid() && value !== this.original?.url ? value : undefined;
  });

  private readonly preview = rxResource({
    params: () => this.previewUrl(),
    stream: ({ params: url }) =>
      timer(PREVIEW_DEBOUNCE_MS).pipe(
        switchMap(() => this.linksApi.preview(url)),
        tap({
          next: (response) => {
            // Not fetched: `preview.title` is only the URL; the server defaults the title itself.
            if (response.fetched) {
              this.autofillTitle(response.preview.title);
            }
          },
          error: () => {
            this.autofillTitle(urlWithoutScheme(url));
          },
        }),
      ),
  });

  protected readonly folderOptions = computed(() => buildFolderOptions(this.folders.entities()));
  protected readonly tagSuggestions = computed<TagSuggestion[]>(() => {
    this.i18n();
    return this.tagStore.entities().map((tag) => ({
      name: tag.name,
      countLabel: this.transloco.translate(pluralKey('tags.count', tag.linkCount), {
        count: tag.linkCount,
      }),
    }));
  });

  protected readonly previewState = computed<PreviewState>(() => {
    if (this.previewUrl() === undefined) {
      return PREVIEW_STATE.Idle;
    }
    if (this.preview.error()) {
      return PREVIEW_STATE.Failed;
    }
    return this.preview.hasValue() ? PREVIEW_STATE.Ready : PREVIEW_STATE.Loading;
  });

  /** What the template shows: an edit has no preview card, only the duplicate notice. */
  protected readonly shownState = computed<PreviewState>(() => {
    const state = this.previewState();
    return this.editing && state !== PREVIEW_STATE.Ready ? PREVIEW_STATE.Idle : state;
  });

  /** The page could not be fetched: the preview only echoes the URL (the duplicate still counts). */
  protected readonly noPreview = computed(
    () =>
      !this.editing &&
      this.previewState() === PREVIEW_STATE.Ready &&
      this.preview.hasValue() &&
      !this.preview.value().fetched,
  );

  protected readonly previewData = computed(() =>
    !this.editing &&
    this.previewState() === PREVIEW_STATE.Ready &&
    this.preview.hasValue() &&
    this.preview.value().fetched
      ? this.preview.value().preview
      : null,
  );

  protected readonly previewHost = computed(() => displayHost(this.previewUrl() ?? ''));

  protected readonly duplicate = computed(() =>
    this.previewState() === PREVIEW_STATE.Ready && this.preview.hasValue()
      ? this.otherThanOriginal(this.preview.value().duplicate)
      : null,
  );

  /** "Saved X, last opened Y" under the form (edit mode). */
  protected readonly meta = computed(() => {
    this.i18n();
    const link = this.original;
    if (!link) {
      return null;
    }
    const locale = this.transloco.getActiveLang();
    const now = Date.now();
    const created = relativeTime(link.createdAt, now, locale);
    return link.lastOpenedAt === null
      ? this.transloco.translate('links.edit.metaNever', { created })
      : this.transloco.translate('links.edit.meta', {
          created,
          opened: relativeTime(link.lastOpenedAt, now, locale),
        });
  });

  constructor() {
    // Usually loaded by the sidebar already; the options fill in when the list arrives.
    void this.folders.load();
    void this.tagStore.load();
    // Tags leave the field the way the API stores them: `normalizeTagName`, deduplicated.
    effect(() => {
      const field = this.form.tags();
      const tags = field.value();
      const normalized = normalizeTagNames(tags);
      if (normalized !== tags) {
        untracked(() => field.value.set([...normalized]));
      }
    });
    // The preview is gone (URL emptied or no longer valid): drop a title it filled in.
    // An `effect` because the field tree exposes `dirty()` but has no value-change hook, and the
    // form model is a plain signal, so a `linkedSignal` could not see whether the user typed.
    effect(() => {
      if (!this.editing && this.previewUrl() === undefined) {
        untracked(() => {
          const title = this.form.title();
          if (!title.dirty()) {
            title.value.set('');
          }
        });
      }
    });
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
      const fetched = this.fetchedPreview();
      const payload: CreateLinkRequest = {
        url: value.url.trim(),
        ...(title && { title }),
        ...(note && { note }),
        ...(value.folderId !== null && { folderId: value.folderId }),
        ...(tags.length > 0 && { tags }),
        ...(fetched?.faviconUrl && { faviconUrl: fetched.faviconUrl }),
        ...(fetched?.imageUrl && { imageUrl: fetched.imageUrl }),
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

  /** The loaded preview of the current URL when the server could fetch the page. */
  private fetchedPreview(): LinkPreview | null {
    return this.previewState() === PREVIEW_STATE.Ready &&
      this.preview.hasValue() &&
      this.preview.value().fetched
      ? this.preview.value().preview
      : null;
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
    if (tags.length !== link.tags.length || tags.some((tag, index) => tag !== link.tags[index])) {
      changes.tags = tags;
    }
    return changes;
  }

  private otherThanOriginal(duplicate: LinkDuplicate | null): LinkDuplicate | null {
    return duplicate && duplicate.id !== this.original?.id ? duplicate : null;
  }

  /** Fills the title from the preview, unless the user has typed in it. */
  private autofillTitle(title: string): void {
    const field = this.form.title();
    if (!this.editing && !field.dirty()) {
      field.value.set(title.slice(0, LINK_LIMIT.TitleMax));
    }
  }

  /** Reads `i18n` so a validation message re-translates when the language changes or loads. */
  private text(key: string, params?: Record<string, unknown>): string {
    this.i18n();
    return this.transloco.translate(key, params);
  }
}
