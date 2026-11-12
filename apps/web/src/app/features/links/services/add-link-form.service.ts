import { effect, inject, Service, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, maxLength, required, validate, type ValidationError } from '@angular/forms/signals';
import { TranslocoService } from '@jsverse/transloco';
import { isHttpUrl, LINK_LIMIT } from '@shelfmark/contracts';
import { injectDialogData } from '@shelfmark/ui';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { normalizeTagNames } from '../../tags/utils/normalize-tag-names';
import { parsePastedLinks } from '../components/paste-many/parse-pasted-links';
import type { ParsedPaste } from '../components/paste-many/models/parsed-paste.interface';
import type { AddLinkDialogData } from '../models/add-link-dialog-data.interface';
import type { AddLinkFormModel } from '../models/add-link-form-model.interface';

/**
 * Form state of the add-link dialog (provided by the dialog component, one instance per dialog):
 * the Signal Form model of the single-link fields, its validation (limits and URL rule mirror the
 * contract), the edit-mode link and the text handed over by ⌘V in the library. Saving lives in
 * `AddLinkSaveService`, which registers itself as the submit action.
 */
@Service({ autoProvided: false })
export class AddLinkFormService {
  private readonly transloco = inject(TranslocoService);
  private readonly settings = inject(UserSettingsStore);
  private readonly data = injectDialogData<AddLinkDialogData>();

  /** Ticks when the active language or its translations change, so messages re-translate. */
  readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  /** The link being edited; `undefined` when adding. */
  readonly original = this.data.link;
  readonly editing = this.original !== undefined;

  /**
   * Text handed over by ⌘V in the library: several links open the list at once (`pasted`), a
   * single one fills the address (and the preview runs as if it had been pasted into the field).
   */
  private readonly handedOver = this.editing ? null : this.readHandedOver();
  /** The handed-over text held several links; the paste-many list opens with them. */
  readonly handedOverMany: ParsedPaste | null =
    this.handedOver !== null && this.handedOver.links.length > 1 ? this.handedOver : null;

  /** Settings › Library › Saving: the default folder and whether pages are fetched. */
  private readonly library = this.settings.libraryShown;

  readonly model = signal<AddLinkFormModel>({
    url: this.original?.url ?? this.handedOverUrl() ?? '',
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

  private submitAction: () => Promise<undefined> = async () => undefined;

  readonly form = form(
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
        action: () => this.submitAction(),
        onInvalid: () => {
          this.form().errorSummary()[0]?.fieldTree().focusBoundControl();
        },
      },
    },
  );

  constructor() {
    // Tags leave the field the way the API stores them: `normalizeTagName`, deduplicated.
    effect(() => {
      const field = this.form.tags();
      const tags = field.value();
      const normalized = normalizeTagNames(tags);
      if (normalized !== tags) {
        untracked(() => field.value.set([...normalized]));
      }
    });
  }

  /** Sets what a valid submit does (the save flow registers it). */
  onSubmit(action: () => Promise<undefined>): void {
    this.submitAction = action;
  }

  /** Reads `i18n` so a validation message re-translates when the language changes or loads. */
  text(key: string, params?: Record<string, unknown>): string {
    this.i18n();
    return this.transloco.translate(key, params);
  }

  private handedOverUrl(): string | null {
    const [url] = this.handedOver?.links ?? [];
    return this.handedOverMany === null && url !== undefined ? url : null;
  }

  private readHandedOver(): ParsedPaste | null {
    const text = this.data.text;
    return text === undefined ? null : parsePastedLinks(text);
  }
}
