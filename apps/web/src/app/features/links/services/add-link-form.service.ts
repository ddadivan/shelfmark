import { effect, inject, Service, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  disabled,
  form,
  maxLength,
  required,
  validate,
  type ValidationError,
} from '@angular/forms/signals';
import { TranslocoService } from '@jsverse/transloco';
import {
  AI_LIMIT,
  isHttpUrl,
  isStorableUrl,
  LINK_LIMIT,
  withDefaultScheme,
} from '@shelfmark/contracts';
import { hasCredentials } from '../utils/has-credentials';
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
    summary: this.original?.summary ?? '',
  });

  /**
   * "Fill in with AI" is waiting for the draft: the fields it can change (Link, Folder, Tags,
   * Summary) are locked until it ends; Title and Note stay editable (#507).
   */
  readonly locked = signal(false);

  private submitAction: () => Promise<undefined> = async () => undefined;

  readonly form = form(
    this.model,
    (path) => {
      disabled(path.url, () => this.locked());
      disabled(path.folderId, () => this.locked());
      disabled(path.tags, () => this.locked());
      disabled(path.summary, () => this.locked());
      required(path.url, { message: () => this.text('links.add.url.required') });
      maxLength(path.url, LINK_LIMIT.UrlMax, {
        message: () => this.text('links.add.url.tooLong', { max: LINK_LIMIT.UrlMax }),
      });
      validate(path.url, ({ value }): ValidationError.WithoutFieldTree | undefined => {
        // A bare host counts as https:// (#405): `example.com` is valid while it is typed.
        const url = withDefaultScheme(value());
        if (url === '' || isStorableUrl(url)) {
          return undefined;
        }
        // A valid link that only fails on a username or password gets its own hint.
        return {
          kind: 'url',
          message: this.text(
            isHttpUrl(url) && hasCredentials(url)
              ? 'links.add.url.credentials'
              : 'links.add.url.invalid',
          ),
        };
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
      maxLength(path.summary, AI_LIMIT.SummaryMax, {
        message: () => this.text('ai.summary.tooLong', { max: AI_LIMIT.SummaryMax }),
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

  /** The address as it is previewed and saved: trimmed, `https://` added to a bare host (#405). */
  url(): string {
    return withDefaultScheme(this.model().url);
  }

  /**
   * Shows the address the way it will be saved (#405): on blur and after a paste the field reads
   * `https://example.com` instead of `example.com`. Text that is not a host stays as typed.
   */
  normalizeUrlField(): void {
    const field = this.form.url();
    const value = field.value();
    const url = withDefaultScheme(value);
    if (url !== value && isHttpUrl(url)) {
      field.value.set(url);
    }
  }

  /**
   * A single address pasted over the whole field goes in already normalised (#405), so the field
   * shows `https://example.com` at once. Returns whether the paste was taken over.
   */
  pasteUrl(event: ClipboardEvent): boolean {
    const input = event.target;
    const text = event.clipboardData?.getData('text/plain') ?? '';
    const url = withDefaultScheme(text);
    if (
      !(input instanceof HTMLInputElement) ||
      url === text.trim() ||
      !isHttpUrl(url) ||
      (input.value !== '' &&
        (input.selectionStart !== 0 || input.selectionEnd !== input.value.length))
    ) {
      return false;
    }
    event.preventDefault();
    this.form.url().value.set(url);
    return true;
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
