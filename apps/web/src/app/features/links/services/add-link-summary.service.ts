import { computed, inject, Injector, Service, signal } from '@angular/core';
import { SUMMARY_SOURCE, type SummarySource, type UpdateLinkRequest } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { LinksStore } from '../../../stores/links.store';
import { AiLinkStateService } from '../../ai/services/ai-link-state.service';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { AddLinkFormService } from './add-link-form.service';

/**
 * The summary field of Edit link (provided by the dialog, `AiSummary` 4–5, #391): shown when the
 * link has a summary or AI writes them. "Written by AI" while the text is AI's and untouched,
 * "Edited by you" once the user typed or it is theirs; Rewrite (AI's text only) asks for a new
 * one and puts it in the field. The save sends `summary` only when the text differs from the
 * saved one (any text is then the user's; empty lets AI write again).
 */
@Service({ autoProvided: false })
export class AddLinkSummaryService {
  private readonly formState = inject(AddLinkFormService);
  private readonly settings = inject(AiSettingsStore);
  private readonly linkState = inject(AiLinkStateService);
  private readonly toasts = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly original = this.formState.original;

  /** The summary as the server has it (a rewrite changes it). */
  private readonly saved = signal(this.original?.summary ?? null);
  private readonly savedSource = signal<SummarySource | null>(this.original?.summarySource ?? null);

  readonly rewriting = this.linkState.rewriting;

  readonly shown = computed(
    () => this.original !== undefined && (this.saved() !== null || this.settings.summariesOn()),
  );

  /** The text differs from the saved summary. */
  private readonly edited = computed(
    () => this.formState.model().summary.trim() !== (this.saved() ?? ''),
  );

  /** Whose text the field holds: `null` while it is empty. */
  readonly source = computed<SummarySource | null>(() => {
    if (this.formState.model().summary.trim() === '') {
      return null;
    }
    return this.edited() || this.savedSource() === SUMMARY_SOURCE.User
      ? SUMMARY_SOURCE.User
      : SUMMARY_SOURCE.Ai;
  });

  /** Rewrite: only for AI's untouched text while AI writes summaries. */
  readonly canRewrite = computed(
    () => this.settings.summariesOn() && this.source() === SUMMARY_SOURCE.Ai,
  );

  /** A new AI summary in the field; a refusal or failure keeps the text and says so. */
  async rewrite(): Promise<void> {
    const link = this.original;
    if (!link || !this.canRewrite()) {
      return;
    }
    const state = await this.linkState.rewrite(link.id);
    if (!state) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.formState.text('ai.summary.rewriteFailed'),
        detail: this.formState.text('ai.summary.rewriteFailedDetail'),
      });
      return;
    }
    this.saved.set(state.summary);
    this.savedSource.set(state.summarySource);
    this.formState.model.update((model) => ({ ...model, summary: state.summary ?? '' }));
    // The feed shows the new summary even if the dialog is cancelled.
    const store = this.injector.get(LinksStore);
    store.applyEdit({
      ...(store.entityMap()[link.id] ?? link),
      summary: state.summary,
      summarySource: state.summarySource,
      aiStatus: state.aiStatus,
    });
  }

  /** The `summary` part of the update request: only when the text changed. */
  changes(): Pick<UpdateLinkRequest, 'summary'> {
    if (!this.shown() || !this.edited()) {
      return {};
    }
    const text = this.formState.model().summary.trim();
    return { summary: text === '' ? null : text };
  }
}
