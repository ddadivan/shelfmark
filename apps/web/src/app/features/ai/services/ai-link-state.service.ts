import { computed, DestroyRef, inject, Injector, Service, signal } from '@angular/core';
import {
  AI_APPLIED_PART,
  SUGGESTION_STATE,
  type AiAppliedPart,
  type LinkAiState,
  type LinkResponse,
  type LinkSuggestion,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { AI_API } from '../models/ai-api.const';
import { AiSettingsStore } from './ai-settings.store';

/**
 * The AI side of one saved link in Edit link (provided by the dialog, #390 / #391): `GET
 * /api/links/:id/ai` once AI is on, the open suggestions (dismiss is remembered by the server),
 * what Automatic mode applied ("Moved by AI" with Undo) and, for the summary field, Rewrite.
 */
@Service({ autoProvided: false })
export class AiLinkStateService {
  private readonly injector = inject(Injector);
  private readonly settings = inject(AiSettingsStore);
  private readonly hidden = signal<ReadonlySet<string>>(new Set());
  private loadedFor: string | null = null;
  private alive = true;

  /** The link's AI state; `null` until loaded (or while AI is off). */
  readonly state = signal<LinkAiState | null>(null);
  /** A rewrite runs. */
  readonly rewriting = signal(false);

  /** The suggestions still open (dashed chips), without the dismissed ones. */
  readonly suggestions = computed<readonly LinkSuggestion[]>(() => {
    const hidden = this.hidden();
    return (this.state()?.suggestions ?? []).filter(
      (item) => item.state === SUGGESTION_STATE.Suggested && !hidden.has(item.id),
    );
  });

  /** What Automatic mode applied and can still be undone; `null` for nothing. */
  readonly autoApplied = computed(() => this.state()?.autoApplied ?? null);

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.alive = false));
  }

  /** Loads the state of the link once (only while AI is on); a failure shows nothing. */
  async load(linkId: string): Promise<void> {
    if (!this.settings.isOn() || this.loadedFor === linkId) {
      return;
    }
    this.loadedFor = linkId;
    try {
      const state = await firstValueFrom(this.injector.get(AI_API).getLinkAi(linkId));
      if (this.alive) {
        this.state.set(state);
      }
    } catch {
      // Nothing AI shows; the dialog works as without AI.
    }
  }

  /** Hides the chip at once and tells the server, so it does not come back on reprocessing. */
  dismiss(id: string): void {
    this.hidden.update((ids) => new Set([...ids, id]));
    firstValueFrom(this.injector.get(AI_API).dismissSuggestion(id)).catch(() => undefined);
  }

  /** Undoes what Automatic mode applied to one part; the link as saved after it, or `null` on failure. */
  async undo(linkId: string, part: AiAppliedPart): Promise<LinkResponse | null> {
    try {
      const link = await firstValueFrom(this.injector.get(AI_API).undoApply(linkId, { part }));
      this.state.update((state) => {
        const applied = state?.autoApplied;
        if (!state || !applied) {
          return state;
        }
        const next =
          part === AI_APPLIED_PART.Folder
            ? { ...applied, folderId: null }
            : { ...applied, tags: [] as string[] };
        return {
          ...state,
          autoApplied: next.folderId === null && next.tags.length === 0 ? null : next,
        };
      });
      return link;
    } catch {
      return null;
    }
  }

  /** "Rewrite": a new AI summary; the new state, or `null` when it failed (limit, refused, error). */
  async rewrite(linkId: string): Promise<LinkAiState | null> {
    if (this.rewriting()) {
      return null;
    }
    this.rewriting.set(true);
    try {
      const state = await firstValueFrom(this.injector.get(AI_API).rewriteSummary(linkId));
      if (this.alive) {
        this.state.set(state);
      }
      return state;
    } catch {
      return null;
    } finally {
      this.rewriting.set(false);
    }
  }
}
