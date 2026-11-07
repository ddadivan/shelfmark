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
import { LINK_LIMIT } from '@shelfmark/contracts';
import {
  ButtonComponent,
  DialogComponent,
  FaviconComponent,
  injectDialogData,
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
import { firstValueFrom, switchMap, tap, timer } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { ADD_LINK_ACTION } from '../models/add-link-action.const';
import type { AddLinkDialogData } from '../models/add-link-dialog-data.interface';
import type { AddLinkSaved } from '../models/add-link-saved.interface';
import type { AddLinkFormModel } from '../models/add-link-form-model.interface';
import type { AddLinkResult } from '../models/add-link-result.type';
import { LINKS_API } from '../models/links-api.const';
import { PREVIEW_STATE } from '../models/preview-state.const';
import type { PreviewState } from '../models/preview-state.type';
import { TAGS_API } from '../models/tags-api.const';
import { buildFolderOptions } from './folder-options';
import { displayHost, isHttpUrl, urlWithoutScheme } from './http-url';

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
 */
@Component({
  selector: 'app-add-link-dialog',
  imports: [
    ButtonComponent,
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

  private readonly linksApi = inject(LINKS_API);
  private readonly folders = inject(FoldersStore);
  private readonly tagsApi = inject(TAGS_API);
  private readonly ref = inject<UiDialogRef<AddLinkResult>>(UiDialogRef);
  private readonly transloco = inject(TranslocoService);
  private readonly data = injectDialogData<AddLinkDialogData>();

  /** Ticks when the active language or its translations change, so messages re-translate. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  private readonly model = signal<AddLinkFormModel>({
    url: '',
    title: '',
    folderId: this.data.folderId ?? null,
    tags: [],
    note: '',
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
    return url.valid() ? url.value().trim() : undefined;
  });

  private readonly preview = rxResource({
    params: () => this.previewUrl(),
    stream: ({ params: url }) =>
      timer(PREVIEW_DEBOUNCE_MS).pipe(
        switchMap(() => this.linksApi.preview(url)),
        tap({
          next: (response) => {
            this.autofillTitle(response.preview.title);
          },
          error: () => {
            this.autofillTitle(urlWithoutScheme(url));
          },
        }),
      ),
  });

  private readonly tags = rxResource({ stream: () => this.tagsApi.list() });

  protected readonly folderOptions = computed(() => buildFolderOptions(this.folders.entities()));
  protected readonly tagSuggestions = computed<TagSuggestion[]>(() =>
    (this.tags.hasValue() ? this.tags.value() : []).map((tag) => ({ name: tag.name })),
  );

  protected readonly previewState = computed<PreviewState>(() => {
    if (this.previewUrl() === undefined) {
      return PREVIEW_STATE.Idle;
    }
    if (this.preview.error()) {
      return PREVIEW_STATE.Failed;
    }
    return this.preview.hasValue() ? PREVIEW_STATE.Ready : PREVIEW_STATE.Loading;
  });

  protected readonly previewData = computed(() =>
    this.previewState() === PREVIEW_STATE.Ready && this.preview.hasValue()
      ? this.preview.value().preview
      : null,
  );

  protected readonly previewHost = computed(() => displayHost(this.previewUrl() ?? ''));

  protected readonly duplicate = computed(() =>
    this.previewState() === PREVIEW_STATE.Ready && this.preview.hasValue()
      ? this.preview.value().duplicate
      : null,
  );

  constructor() {
    // Usually loaded by the sidebar already; the options fill in when the list arrives.
    void this.folders.load();
    // The preview is gone (URL emptied or no longer valid): drop a title it filled in.
    // An `effect` because the field tree exposes `dirty()` but has no value-change hook, and the
    // form model is a plain signal, so a `linkedSignal` could not see whether the user typed.
    effect(() => {
      if (this.previewUrl() === undefined) {
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
  protected readonly saveFailed = signal(false);

  protected openExisting(): void {
    const existing = this.duplicate();
    if (existing) {
      this.ref.close({ action: ADD_LINK_ACTION.OpenExisting, existing });
    }
  }

  protected cancel(): void {
    this.ref.close();
  }

  private async save(): Promise<undefined> {
    if (this.saving()) {
      return;
    }
    const value = this.model();
    const title = value.title.trim();
    const note = value.note.trim();
    this.saving.set(true);
    this.saveFailed.set(false);
    try {
      const pending = firstValueFrom(
        this.linksApi.create({
          url: value.url.trim(),
          ...(title && { title }),
          ...(note && { note }),
          ...(value.folderId !== null && { folderId: value.folderId }),
          ...(value.tags.length > 0 && { tags: value.tags }),
        }),
      ).then((link): AddLinkSaved => ({ action: ADD_LINK_ACTION.Saved, link }));
      // Kept for the service: the caller gets the result even if the dialog was dismissed meanwhile.
      this.data.session.saving = pending.catch(() => undefined);
      const saved = await pending;
      // `saving` stays on: the button keeps its spinner while the dialog leaves.
      this.ref.close(saved);
    } catch {
      this.saving.set(false);
      this.saveFailed.set(true);
    }
  }

  /** Fills the title from the preview, unless the user has typed in it. */
  private autofillTitle(title: string): void {
    const field = this.form.title();
    if (!field.dirty()) {
      field.value.set(title.slice(0, LINK_LIMIT.TitleMax));
    }
  }

  /** Reads `i18n` so a validation message re-translates when the language changes or loads. */
  private text(key: string, params?: Record<string, unknown>): string {
    this.i18n();
    return this.transloco.translate(key, params);
  }
}
