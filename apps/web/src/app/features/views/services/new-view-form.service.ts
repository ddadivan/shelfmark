import { computed, inject, Service, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  form,
  maxLength,
  readonly,
  required,
  validate,
  type ValidationError,
} from '@angular/forms/signals';
import { TranslocoService } from '@jsverse/transloco';
import {
  LINK_LIMIT,
  SAVED_VIEW_LIMIT,
  type ViewDraft,
  type ViewDraftField,
} from '@shelfmark/contracts';
import { injectDialogData, UiDialogRef } from '@shelfmark/ui';
import { TagsStore } from '../../../stores/tags.store';
import type { NewViewDialogData } from '../models/new-view-dialog-data.interface';
import type { NewViewModel } from '../models/new-view-model.interface';
import type { NewViewRows } from '../models/new-view-rows.interface';
import { NEW_VIEW_ERROR } from '../models/new-view-error.const';
import { VIEW_NAME_ERROR } from '../models/view-name-error.const';
import { queryOfRows, rowsOfQuery, sameRow } from '../utils/new-view-rows';

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Form state of the new view dialog (provided by the dialog component, one instance per dialog):
 * the Signal Form of phrase, rows and name, the stored `query` the rows make, the sparks of the
 * rows AI set, and Save. The dialog stays open with an error line when `submit` resolves an error
 * key and closes on success.
 */
@Service({ autoProvided: false })
export class NewViewFormService {
  private readonly data = injectDialogData<NewViewDialogData>();
  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);
  private readonly transloco = inject(TranslocoService);
  private readonly tagStore = inject(TagsStore);

  /** Ticks when the active language or its translations change, so messages re-translate. */
  readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  readonly model = signal<NewViewModel>({
    phrase: '',
    ...rowsOfQuery(this.data.query),
    name: '',
  });

  /** The phrase cannot change while AI composes from it. */
  readonly phraseLocked = signal(false);

  readonly form = form(
    this.model,
    (path) => {
      readonly(path.phrase, () => this.phraseLocked());
      required(path.name, { message: () => this.text('views.name.required') });
      validate(path.name, ({ value }): ValidationError.WithoutFieldTree | undefined =>
        value() !== '' && value().trim() === ''
          ? { kind: VIEW_NAME_ERROR.Blank, message: this.text('views.name.required') }
          : undefined,
      );
      maxLength(path.name, SAVED_VIEW_LIMIT.NameMax, {
        message: () => this.text('views.name.tooLong', { max: SAVED_VIEW_LIMIT.NameMax }),
      });
      maxLength(path.q, LINK_LIMIT.QueryMax, {
        message: () => this.text('views.new.q.tooLong', { max: LINK_LIMIT.QueryMax }),
      });
      // Existing tags only: a typed name that is not one of the user's tags is an error.
      validate(path.tags, ({ value }): ValidationError.WithoutFieldTree | undefined => {
        if (!this.tagStore.loaded()) {
          return undefined;
        }
        const known = new Set(this.tagStore.entities().map((tag) => tag.name.toLowerCase()));
        const unknown = value().find((name) => !known.has(name.toLowerCase()));
        return unknown === undefined
          ? undefined
          : {
              kind: NEW_VIEW_ERROR.UnknownTag,
              message: this.text('views.new.tags.unknown', { name: unknown }),
            };
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

  /** The filter rows as the controls hold them. */
  readonly rows = computed<NewViewRows>(
    () => {
      const { where, kind, tags, q, sort } = this.model();
      return { where, kind, tags, q, sort };
    },
    { equal: sameJson },
  );

  /** What the rows store; the same value until a row changes, so the live count asks once. */
  readonly query = computed(() => queryOfRows(this.rows()), { equal: sameJson });

  /** The rows AI filled in and as it filled them in, until the user changes the row. */
  private readonly drafted = signal<{ rows: NewViewRows; set: readonly ViewDraftField[] } | null>(
    null,
  );

  /** The rows that carry the spark: set by AI and still as AI left them. */
  readonly sparks = computed<ReadonlySet<ViewDraftField>>(() => {
    const drafted = this.drafted();
    const rows = this.rows();
    return new Set(drafted?.set.filter((field) => sameRow(field, rows, drafted.rows)));
  });

  readonly saving = signal(false);
  readonly errorKey = signal<string | null>(null);

  /**
   * Puts a draft into the rows (all of them: a phrase describes the whole filter) and its name into
   * the name field unless the user typed one.
   */
  applyDraft(draft: ViewDraft): void {
    const rows = rowsOfQuery(draft.query);
    this.model.update((model) => ({
      ...model,
      ...rows,
      name: this.form.name().dirty() && model.name.trim() !== '' ? model.name : draft.name,
    }));
    this.drafted.set({ rows, set: draft.set });
  }

  cancel(): void {
    this.ref.close();
  }

  private async save(): Promise<undefined> {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.errorKey.set(null);
    const error = await this.data.submit(this.model().name.trim(), this.query());
    if (error === null) {
      // `saving` stays on: the button keeps its spinner while the dialog leaves.
      this.ref.close(true);
    } else {
      this.saving.set(false);
      this.errorKey.set(error);
    }
  }

  /** Reads `i18n` so a validation message re-translates when the language changes or loads. */
  private text(key: string, params?: Record<string, unknown>): string {
    this.i18n();
    return this.transloco.translate(key, params);
  }
}
