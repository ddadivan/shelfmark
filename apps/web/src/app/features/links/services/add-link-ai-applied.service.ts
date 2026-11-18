import { computed, inject, Injector, Service, signal } from '@angular/core';
import { AI_APPLIED_PART, type AiAppliedPart } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { pluralKey } from '../../../core/i18n/plural-key';
import { LinksStore } from '../../../stores/links.store';
import { AiLinkStateService } from '../../ai/services/ai-link-state.service';
import { tagKey } from '../utils/tag-key';
import { AddLinkFormService } from './add-link-form.service';

/**
 * Edit link (provided by the dialog, `AiTags` 11): what Automatic mode applied while the field
 * still shows it ("Moved by AI", "2 added by AI") and its Undo, which puts the field and the feed
 * back to the link as the server has it then.
 */
@Service({ autoProvided: false })
export class AddLinkAiAppliedService {
  private readonly formState = inject(AddLinkFormService);
  private readonly linkState = inject(AiLinkStateService);
  private readonly toasts = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly editing = this.formState.editing;

  /** An Undo runs, by part. */
  readonly undoing = signal<AiAppliedPart | null>(null);

  /** The folder AI moved the link to, while the field still holds it. */
  readonly folderApplied = computed(() => {
    const folderId = this.linkState.autoApplied()?.folderId ?? null;
    return this.editing && folderId !== null && this.formState.model().folderId === folderId;
  });

  /** How many of the tags AI added are still in the field. */
  readonly tagsApplied = computed(() => {
    const added = this.linkState.autoApplied()?.tags ?? [];
    const present = new Set(this.formState.model().tags.map(tagKey));
    return this.editing ? added.filter((tag) => present.has(tagKey(tag))).length : 0;
  });

  /** "2 added by AI" for the tags mark. */
  readonly tagsAppliedLabel = computed(() => {
    this.formState.i18n();
    const count = this.tagsApplied();
    return this.formState.text(pluralKey('ai.applied.tags', count), { count });
  });

  async undo(part: AiAppliedPart): Promise<void> {
    const link = this.formState.original;
    if (!link || this.undoing() !== null) {
      return;
    }
    const removed = new Set((this.linkState.autoApplied()?.tags ?? []).map(tagKey));
    this.undoing.set(part);
    const saved = await this.linkState.undo(link.id, part);
    this.undoing.set(null);
    if (!saved) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.formState.text('ai.applied.undoFailed'),
      });
      return;
    }
    this.formState.model.update((model) =>
      part === AI_APPLIED_PART.Folder
        ? { ...model, folderId: saved.folderId }
        : { ...model, tags: model.tags.filter((tag) => !removed.has(tagKey(tag))) },
    );
    this.injector.get(LinksStore).applyEdit(saved);
  }
}
