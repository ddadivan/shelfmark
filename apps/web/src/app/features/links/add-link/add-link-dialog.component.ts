import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
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
  LINK_KIND,
  LINK_LIMIT,
  type CreateLinkRequest,
  type LinkDuplicate,
  type LinkPreview,
  type LinkResponse,
  type UpdateLinkRequest,
} from '@shelfmark/contracts';
import { isLinkKind } from '../link-kind';
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
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { ViewportService } from '../../../core/layout/viewport.service';
import { pluralKey } from '../../../core/i18n/plural-key';
import { isMacPlatform } from '../../search/is-mac-platform';
import { normalizeTagNames } from '../../tags/normalize-tag-names';
import { ADD_LINK_ACTION } from '../models/add-link-action.const';
import type { AddLinkDialogData } from '../models/add-link-dialog-data.interface';
import type { AddLinkSaved } from '../models/add-link-saved.interface';
import type { AddLinkFormModel } from '../models/add-link-form-model.interface';
import type { AddSeveralFormModel } from '../models/add-several-form-model.interface';
import type { AddLinkResult } from '../models/add-link-result.type';
import { LINKS_API } from '../models/links-api.const';
import { PREVIEW_STATE } from '../models/preview-state.const';
import type { PreviewState } from '../models/preview-state.type';
import { LocaleService } from '../../../core/i18n/locale.service';
import { parsePastedLinks } from '../paste-many/parse-pasted-links';
import type { ParsedPaste } from '../paste-many/models/parsed-paste.interface';
import { PasteManyListComponent } from '../paste-many/paste-many-list.component';
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
  private readonly linksApi = inject(LINKS_API);
  private readonly folders = inject(FoldersStore);
  private readonly tagStore = inject(TagsStore);
  private readonly ref = inject<UiDialogRef<AddLinkResult>>(UiDialogRef);
  private readonly transloco = inject(TranslocoService);
  private readonly localeService = inject(LocaleService);
  /** Settings › Language › Spell-check notes. */
  protected readonly spellcheck = this.localeService.spellcheck;
  private readonly data = injectDialogData<AddLinkDialogData>();
  /** Settings › Library › Saving: default folder, duplicate notice, whether pages are fetched. */
  private readonly library = inject(UserSettingsStore).libraryShown;

  /** Ticks when the active language or its translations change, so messages re-translate. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  /** The link being edited; `undefined` when adding. */
  protected readonly original = this.data.link;
  protected readonly editing = this.original !== undefined;

  /** What a paste with several links held; set, the paste-many list replaces the form. */
  protected readonly pasted = signal<ParsedPaste | null>(null);

  /**
   * "Add several links" (#315): a large text area replaces the single-link fields; pasting into
   * it or "Find links" reads the text with the paste-many parser and opens the same list.
   */
  protected readonly several = signal(false);
  private readonly injector = inject(Injector);
  private readonly severalModel = signal<AddSeveralFormModel>({ text: '' });
  protected readonly severalForm = form(
    this.severalModel,
    (path) => {
      validate(path.text, ({ value }): ValidationError.WithoutFieldTree | undefined =>
        value().trim() === ''
          ? { kind: 'required', message: this.text('links.add.several.required') }
          : parsePastedLinks(value()).links.length === 0
            ? { kind: 'noLinks', message: this.text('links.add.several.none') }
            : undefined,
      );
    },
    {
      submission: {
        action: async () => {
          this.openList(parsePastedLinks(this.severalModel().text));
        },
        onInvalid: () => {
          this.severalForm.text().focusBoundControl();
        },
      },
    },
  );
  private readonly handedOver = this.editing ? null : this.readHandedOver();

  private readonly model = signal<AddLinkFormModel>({
    url: this.original?.url ?? this.handedOver?.url ?? '',
    title: this.original?.title ?? '',
    // The folder of the page, else "New links go to" (null is Unsorted).
    folderId: this.original
      ? this.original.folderId
      : (this.data.folderId ?? this.library().newLinksFolderId),
    tags: [...normalizeTagNames(this.original?.tags ?? [])],
    note: this.original?.note ?? '',
    isFavorite: this.original?.isFavorite ?? false,
    kind: this.original?.kind ?? null,
  });

  /** Edit mode: the "Type" select (video, article, shopping, other). */
  protected readonly kindOptions = computed(() => {
    this.i18n();
    return Object.values(LINK_KIND).map((kind) => ({
      id: kind,
      name: this.transloco.translate(`links.kindOption.${kind}`),
    }));
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

  /** "Fetch titles and previews" is on: the preview loads the page (else it only checks duplicates). */
  protected readonly fetchPages = computed(() => this.library().fetchPreviews);
  private readonly warnDuplicates = computed(() => this.library().warnDuplicates);

  /** The typed URL once it is a valid http(s) URL; the preview follows it. */
  private readonly previewUrl = computed(() => {
    const url = this.form.url();
    const value = url.value().trim();
    // Neither a page nor a duplicate to show (an edit only ever checks duplicates): no request.
    const wanted = this.warnDuplicates() || (!this.editing && this.fetchPages());
    // Editing: the saved address needs no preview, only a changed one is checked for duplicates.
    return wanted && url.valid() && value !== this.original?.url ? value : undefined;
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
    // Without page fetches the request is only the duplicate check: no skeleton, no failure.
    return (this.editing || !this.fetchPages()) && state !== PREVIEW_STATE.Ready
      ? PREVIEW_STATE.Idle
      : state;
  });

  /** The page could not be fetched: the preview only echoes the URL (the duplicate still counts). */
  protected readonly noPreview = computed(
    () =>
      !this.editing &&
      this.fetchPages() &&
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
    this.warnDuplicates() && this.previewState() === PREVIEW_STATE.Ready && this.preview.hasValue()
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

  /**
   * A paste into the address field: text with more than one link opens the paste-many list
   * instead of landing in the field. One link (or none) pastes as usual.
   */
  protected onUrlPaste(event: ClipboardEvent): void {
    if (this.editing) {
      return;
    }
    const parsed = parsePastedLinks(event.clipboardData?.getData('text/plain') ?? '');
    if (parsed.links.length > 1) {
      event.preventDefault();
      this.pasted.set(parsed);
    }
  }

  protected openExisting(): void {
    const existing = this.duplicate();
    if (existing) {
      this.ref.close({ action: ADD_LINK_ACTION.OpenExisting, existing });
    }
  }

  /** Cmd / Ctrl + Enter saves from any field (Enter alone in a text field submits as before). */
  /** Switches to the several-links text area and puts focus in it. */
  protected showSeveral(): void {
    this.several.set(true);
    afterNextRender(
      { read: () => this.severalForm.text().focusBoundControl() },
      {
        injector: this.injector,
      },
    );
  }

  /** Back to one link, focus on the address field. */
  protected showSingle(): void {
    this.several.set(false);
    afterNextRender(
      { read: () => this.form.url().focusBoundControl() },
      {
        injector: this.injector,
      },
    );
  }

  /** A paste into the text area that holds links goes straight to the list. */
  protected onSeveralPaste(event: ClipboardEvent): void {
    const parsed = parsePastedLinks(event.clipboardData?.getData('text/plain') ?? '');
    if (parsed.links.length > 0) {
      event.preventDefault();
      this.openList(parsed);
    }
  }

  protected onSeveralKeydown(event: KeyboardEvent): void {
    if (event.key === KEYBOARD_KEY.Enter && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      (event.currentTarget as HTMLFormElement).requestSubmit();
    }
  }

  private openList(parsed: ParsedPaste): void {
    if (parsed.links.length > 0) {
      this.pasted.set(parsed);
    }
  }

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
    if (value.kind !== link.kind && isLinkKind(value.kind)) {
      changes.kind = value.kind;
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

  /**
   * Text handed over by ⌘V in the library: several links open the list at once, a single one
   * fills the address (and the preview runs as if it had been pasted into the field).
   */
  private readHandedOver(): { url: string } | null {
    const text = this.data.text;
    if (text === undefined) {
      return null;
    }
    const parsed = parsePastedLinks(text);
    if (parsed.links.length > 1) {
      this.pasted.set(parsed);
      return null;
    }
    const [url] = parsed.links;
    return url === undefined ? null : { url };
  }

  /** Reads `i18n` so a validation message re-translates when the language changes or loads. */
  private text(key: string, params?: Record<string, unknown>): string {
    this.i18n();
    return this.transloco.translate(key, params);
  }
}
