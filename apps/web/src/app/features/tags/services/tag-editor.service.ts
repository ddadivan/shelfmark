import { computed, inject, Service, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form } from '@angular/forms/signals';
import { TranslocoService } from '@jsverse/transloco';
import { normalizeTagName, type TagResponse } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { TAG_OUTCOME } from '../../../stores/models/tag-outcome.const';
import { TagsStore } from '../../../stores/tags.store';
import type { TagFieldError } from '../models/tag-field-error.interface';
import { tagSaveError } from '../utils/tag-save-error';
import { validateTagName } from '../utils/validate-tag-name';
import { TagActionsService } from './tag-actions.service';

/**
 * The state and the save of the inline tag field of the sidebar: "+" creates a tag, a rename
 * works in place on a chip, and a name that exists offers to merge instead. Provided by the
 * component (one per sidebar), not app-wide; the component closes the field (and moves focus)
 * through `onSettled`.
 */
@Service({ autoProvided: false })
export class TagEditorService {
  private readonly tags = inject(TagsStore);
  private readonly actions = inject(TagActionsService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  /** Ticks when the active language or its translations change, so messages re-translate. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  /**
   * Called when a save or a merge went through and the field should close; `createdId` is the
   * new tag after "+" (focus goes to its chip).
   */
  onSettled: (createdId?: string) => void = () => undefined;

  /** The "+" field is open. */
  readonly adding = signal(false);
  /** `id` of the tag being renamed in place. */
  readonly renamingId = signal<string | null>(null);
  readonly editing = computed(() => this.adding() || this.renamingId() !== null);
  private readonly model = signal({ name: '' });
  readonly form = form(this.model, () => undefined, {
    submission: { action: () => this.save() },
  });
  readonly saving = signal(false);
  private readonly errorState = signal<TagFieldError | null>(null);
  /** The message under the field, translated again when the language changes. */
  readonly fieldError = computed(() => {
    this.i18n();
    const error = this.errorState();
    return error ? this.transloco.translate(error.key, error.params) : '';
  });
  /** The existing tag a rename ran into: the merge is offered. */
  readonly conflict = signal<TagResponse | null>(null);

  /** The editor takes the whole row when it shows an error or the offer to merge. */
  readonly editorWide = computed(() => this.conflict() !== null || this.fieldError() !== '');

  open(name: string, renamingId: string | null, adding: boolean): void {
    this.errorState.set(null);
    this.conflict.set(null);
    this.model.set({ name });
    this.renamingId.set(renamingId);
    this.adding.set(adding);
  }

  /** Closes the field and drops its message and merge offer. */
  close(): void {
    this.adding.set(false);
    this.renamingId.set(null);
    this.errorState.set(null);
    this.conflict.set(null);
  }

  async mergeIntoConflict(): Promise<void> {
    const target = this.conflict();
    const source = this.tags.entityMap()[this.renamingId() ?? ''];
    if (!target || !source || this.saving()) {
      return;
    }
    this.saving.set(true);
    const merged = await this.actions.mergeInto(source, target);
    this.saving.set(false);
    if (merged) {
      this.onSettled();
    }
  }

  /** Enter in the field: create or rename. A refused name keeps the field open with the reason. */
  private async save(): Promise<undefined> {
    if (this.saving()) {
      return;
    }
    const name = normalizeTagName(this.model().name);
    const error = validateTagName(name, this.renamingId() !== null, this.tags.atLimit());
    if (error) {
      this.errorState.set(error);
      return;
    }
    const renamingId = this.renamingId();
    const previous = renamingId === null ? undefined : this.tags.entityMap()[renamingId];
    if (previous && previous.name === name) {
      this.onSettled();
      return;
    }
    this.saving.set(true);
    this.errorState.set(null);
    this.conflict.set(null);
    const result = previous
      ? await this.tags.rename(previous.id, name)
      : await this.tags.create(name);
    this.saving.set(false);
    if (result.outcome === TAG_OUTCOME.Done) {
      if (previous) {
        this.actions.renamed(previous.name, name);
      } else {
        this.toasts.show({
          kind: TOAST_KIND.Success,
          title: this.transloco.translate('tags.add.done', { name }),
        });
      }
      this.onSettled(previous ? undefined : result.tag?.id);
      return;
    }
    const failure = tagSaveError(result, previous !== undefined, name);
    if (failure) {
      this.errorState.set(failure);
    } else if (result.tag) {
      this.conflict.set(result.tag);
    }
  }
}
