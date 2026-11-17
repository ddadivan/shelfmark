import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormField, type FieldTree } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { SUMMARY_SOURCE, type SummarySource } from '@shelfmark/contracts';
import {
  BadgeComponent,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  TextareaComponent,
} from '@shelfmark/ui';

/**
 * The "Summary" field of Edit link (`AiSummary` 4–5, #391): the editable text, a badge ("Written
 * by AI" with the spark, or "Edited by you"), Rewrite while the text is AI's, and the hint (the
 * visible disclaimer for AI's text, "clear it to let AI write again" for the user's). The flow
 * lives in `AddLinkSummaryService`; this only renders.
 */
@Component({
  selector: 'app-summary-field',
  imports: [BadgeComponent, ButtonComponent, FormField, TextareaComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './summary-field.component.html',
  styleUrl: './summary-field.component.scss',
})
export class SummaryFieldComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly SUMMARY_SOURCE = SUMMARY_SOURCE;

  readonly field = input.required<FieldTree<string>>();
  /** Whose text the field holds; `null` while empty. */
  readonly source = input<SummarySource | null>(null);
  readonly canRewrite = input(false);
  readonly rewriting = input(false);

  readonly rewrite = output<void>();

  protected readonly hintKey = computed(() => {
    switch (this.source()) {
      case SUMMARY_SOURCE.Ai:
        return 'ai.summary.hintAi';
      case SUMMARY_SOURCE.User:
        return 'ai.summary.hintUser';
      default:
        return 'ai.summary.hintEmpty';
    }
  });
}
