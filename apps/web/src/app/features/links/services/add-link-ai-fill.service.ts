import { computed, inject, Service, signal } from '@angular/core';
import { AI_FILL_SHORTCUT } from '../models/ai-fill-shortcut.const';
import { AddLinkAiService } from './add-link-ai.service';
import { AddLinkFormService } from './add-link-form.service';
import { AddLinkSummaryService } from './add-link-summary.service';

/**
 * "Fill in with AI" of the link dialog (F1c, provided by the dialog, `AiTags` 12–14): one click or
 * Alt+Shift+F applies everything AI proposes that has a free place: the folder into an empty
 * Folder field, the existing tags next to the user's, and (Edit link) AI's summary into an empty
 * Summary field. A new tag stays a chip; nothing the user chose is replaced. Available only while
 * AI is on and something is left to apply.
 */
@Service({ autoProvided: false })
export class AddLinkAiFillService {
  private readonly ai = inject(AddLinkAiService);
  private readonly summary = inject(AddLinkSummaryService);
  private readonly formState = inject(AddLinkFormService);

  /** Said by the button's live region after a fill. */
  readonly announcement = signal('');

  readonly available = computed(
    () =>
      this.ai.on() &&
      (this.ai.fillFolderId() !== null ||
        this.ai.fillTags().length > 0 ||
        this.summary.fillSummary() !== null),
  );

  /** Applies what is available; `false` when there was nothing to apply. */
  run(): boolean {
    if (!this.available()) {
      return false;
    }
    this.ai.fill();
    this.summary.fill();
    this.announcement.set(this.formState.text('ai.fill.done'));
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
}
