import { computed, effect, inject, Service, signal, untracked } from '@angular/core';
import { LINK_LIMIT } from '@shelfmark/contracts';
import type { AddLinkFilledValues } from '../models/add-link-filled-values.interface';
import type { AddLinkFormModel } from '../models/add-link-form-model.interface';
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
 * unlock. Closing the dialog ends it (nothing applied). A new address after a fill (#510) takes
 * back what the fill put in and the user has not changed since (folder, tags, summary, title), so
 * the next page does not inherit the previous page's suggestions; the user's own values stay.
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

  /** What the last fill put in (Add link), to take back when the address changes. */
  private filled: AddLinkFilledValues | null = null;

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
    // Another address after a fill: what the fill put in goes again.
    effect(() => {
      const url = this.preview.previewUrl();
      untracked(() => {
        if (this.filled !== null && url !== this.filled.url) {
          this.takeBack(this.filled);
        }
      });
    });
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
    const before = this.formState.model();
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
    if (applied) {
      this.remember(before);
    }
    return applied;
  }

  /** Notes what the fill changed compared with `before`. */
  private remember(before: AddLinkFormModel): void {
    const after = this.formState.model();
    const known = new Set(before.tags.map((tag) => tag.toLowerCase()));
    this.filled = {
      url: this.preview.previewUrl(),
      folderId: after.folderId !== before.folderId ? after.folderId : null,
      tags: after.tags.filter((tag) => !known.has(tag.toLowerCase())),
      summary: after.summary !== before.summary ? after.summary : null,
      title: after.title !== before.title ? after.title : null,
    };
  }

  /** Takes back the filled values the user has not changed since. */
  private takeBack(filled: AddLinkFilledValues): void {
    this.filled = null;
    const added = new Set(filled.tags);
    this.formState.model.update((model) => ({
      ...model,
      folderId:
        filled.folderId !== null && model.folderId === filled.folderId ? null : model.folderId,
      tags: model.tags.filter((tag) => !added.has(tag)),
      summary: filled.summary !== null && model.summary === filled.summary ? '' : model.summary,
      title: filled.title !== null && model.title === filled.title ? '' : model.title,
    }));
    this.summary.forgetDraft();
  }
}
