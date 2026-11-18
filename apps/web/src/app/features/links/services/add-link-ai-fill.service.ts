import { computed, effect, inject, Service, signal, untracked } from '@angular/core';
import { LINK_LIMIT } from '@shelfmark/contracts';
import { AI_FILL_SHORTCUT } from '../models/ai-fill-shortcut.const';
import { PREVIEW_STATE } from '../models/preview-state.const';
import { AddLinkAiService } from './add-link-ai.service';
import { AddLinkFormService } from './add-link-form.service';
import { AddLinkPreviewService } from './add-link-preview.service';
import { AddLinkSummaryService } from './add-link-summary.service';

/**
 * "Fill in with AI" of the link dialog (F1c, provided by the dialog, `AiTags` 12–14, #507): one
 * click or Alt+Shift+F fills in everything AI proposes, and the user may change anything after:
 * all suggested tags (new ones too, next to the user's own), the folder unless the user chose one
 * (Unsorted or empty is not a choice), AI's summary into an empty Summary field and, in Add link,
 * the cleaned-up title while the title is still the page's (not edited). The Note is never
 * touched. While AI is on the button always shows; in Add link it waits ("Paste a link first")
 * until the Link field holds a valid address. If the draft is still running the press starts a
 * busy state: Link, Folder, Tags and Summary are locked and Create link is inactive until the draft
 * arrives (or is too slow, fails, or finds nothing), then what came is applied and the fields
 * unlock. Closing the dialog ends it (nothing applied).
 */
@Service({ autoProvided: false })
export class AddLinkAiFillService {
  private readonly ai = inject(AddLinkAiService);
  private readonly summary = inject(AddLinkSummaryService);
  private readonly formState = inject(AddLinkFormService);
  private readonly preview = inject(AddLinkPreviewService);

  /** Said by the button's live region after a fill. */
  readonly announcement = signal('');

  /** Waiting for the draft: the fields Fill changes are locked. */
  readonly busy = signal(false);

  /** The button shows while AI is on. */
  readonly available = computed(() => this.ai.on());

  /** Add link without a valid address yet: the button is inactive (`aria-disabled`). */
  readonly needsLink = computed(
    () => !this.formState.editing && this.preview.previewUrl() === undefined,
  );

  constructor() {
    // The draft arrived (or none will): apply what came and unlock.
    effect(() => {
      if (!this.busy()) {
        return;
      }
      const noDraft = this.preview.previewState() === PREVIEW_STATE.Failed;
      if (this.ai.draftSettled() || noDraft || this.needsLink()) {
        untracked(() => this.finish());
      }
    });
    // The lock lives in the form service, which owns the fields.
    effect(() => this.formState.locked.set(this.busy()));
  }

  /**
   * Starts a fill; `false` while it cannot run (AI off, no address yet, already running).
   * Applies at once when the draft is there, otherwise waits for it.
   */
  run(): boolean {
    if (!this.available() || this.needsLink() || this.busy()) {
      return false;
    }
    if (this.waitsForDraft()) {
      this.busy.set(true);
      this.announcement.set(this.formState.text('ai.fill.filling'));
      return true;
    }
    this.finish();
    return true;
  }

  /** Alt+Shift+F (Option+Shift+F) anywhere in the dialog; `true` when it was the shortcut. */
  handleShortcut(event: KeyboardEvent): boolean {
    if (
      event.code !== AI_FILL_SHORTCUT.code ||
      !event.altKey ||
      !event.shiftKey ||
      event.metaKey ||
      event.ctrlKey
    ) {
      return false;
    }
    event.preventDefault();
    this.run();
    return true;
  }

  /** Adding, with the draft not answered yet. */
  private waitsForDraft(): boolean {
    return (
      !this.formState.editing &&
      !this.ai.draftSettled() &&
      this.preview.previewState() !== PREVIEW_STATE.Failed
    );
  }

  private finish(): void {
    this.busy.set(false);
    const applied = this.apply();
    this.announcement.set(this.formState.text(applied ? 'ai.fill.done' : 'ai.fill.nothing'));
  }

  /** Applies what is available; `true` when something was put in a field. */
  private apply(): boolean {
    let applied = this.ai.fill();
    if (this.formState.editing) {
      return this.summary.fill() || applied;
    }
    applied = this.summary.fillDraft(this.ai.draftSummary()) || applied;
    const title = this.ai.draftTitle();
    const field = this.formState.form.title();
    // The page's own title only: a title the user typed or edited wins.
    if (title !== null && !field.dirty() && field.value() !== title) {
      field.value.set(title.slice(0, LINK_LIMIT.TitleMax));
      applied = true;
    }
    return applied;
  }
}
