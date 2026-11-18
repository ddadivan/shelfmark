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
 *
 * Add link (#507): the field appears once "Fill in with AI" put the draft's summary in it
 * (`fillDraft`); while the text is that AI text the save sends nothing (the server applies the
 * draft's summary as AI's); any other text is the user's and goes with the create request.
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

  /** Add link: the AI text "Fill in with AI" put in the field; `null` until it did. */
  private readonly draftText = signal<string | null>(null);

  readonly shown = computed(() =>
    this.original === undefined
      ? this.draftText() !== null || this.formState.model().summary.trim() !== ''
      : this.saved() !== null || this.settings.summariesOn(),
  );

  /** The text differs from the saved summary. */
  private readonly edited = computed(
    () => this.formState.model().summary.trim() !== (this.saved() ?? ''),
  );

  /** Whose text the field holds: `null` while it is empty. */
  readonly source = computed<SummarySource | null>(() => {
    const text = this.formState.model().summary.trim();
    if (text === '') {
      return null;
    }
    if (this.original === undefined) {
      return text === this.draftText() ? SUMMARY_SOURCE.Ai : SUMMARY_SOURCE.User;
    }
    return this.edited() || this.savedSource() === SUMMARY_SOURCE.User
      ? SUMMARY_SOURCE.User
      : SUMMARY_SOURCE.Ai;
  });

  /** Rewrite: only for AI's untouched text while AI writes summaries. */
  readonly canRewrite = computed(
    () =>
      this.original !== undefined &&
      this.settings.summariesOn() &&
      this.source() === SUMMARY_SOURCE.Ai,
  );

  /**
   * Fill in with AI (F1c): AI's summary for an empty field, the one that came in since the
   * dialog opened or the saved one the user cleared; never over text in the field.
   */
  readonly fillSummary = computed<string | null>(() => {
    if (!this.shown() || this.formState.model().summary.trim() !== '') {
      return null;
    }
    const state = this.linkState.state();
    if (state?.summary && state.summarySource === SUMMARY_SOURCE.Ai) {
      return state.summary;
    }
    const saved = this.saved();
    return saved !== null && this.savedSource() === SUMMARY_SOURCE.Ai ? saved : null;
  });

  /** Puts `fillSummary` into the field; it is the saved AI text, so the save sends nothing for it. */
  fill(): boolean {
    const text = this.fillSummary();
    if (text === null) {
      return false;
    }
    this.saved.set(text);
    this.savedSource.set(SUMMARY_SOURCE.Ai);
    this.formState.model.update((model) => ({ ...model, summary: text }));
    return true;
  }

  /**
   * Add link, "Fill in with AI": the draft's summary into an empty Summary field. `false` when the
   * field already has text (the user's wins) or there is none.
   */
  /** A new address after a fill (#510): the AI text no longer belongs to this link. */
  forgetDraft(): void {
    this.draftText.set(null);
  }

  fillDraft(text: string | null): boolean {
    if (
      this.original !== undefined ||
      text === null ||
      this.formState.model().summary.trim() !== ''
    ) {
      return false;
    }
    this.draftText.set(text);
    this.formState.model.update((model) => ({ ...model, summary: text }));
    return true;
  }

  /** The `summary` of a create request: the user's own text; nothing for AI's untouched text. */
  createSummary(): string | undefined {
    const text = this.formState.model().summary.trim();
    return this.original === undefined && text !== '' && text !== this.draftText()
      ? text
      : undefined;
  }

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
