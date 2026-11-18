import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AI_APPLIED_PART } from '@shelfmark/contracts';
import { AiLineComponent } from '@shelfmark/ui';
import { AiAppliedComponent } from '../../../ai/components/ai-applied/ai-applied.component';
import { AiSuggestionRowComponent } from '../../../ai/components/suggestion-rows/ai-suggestion-row.component';
import { AddLinkAiAppliedService } from '../../services/add-link-ai-applied.service';
import { AddLinkAiService } from '../../services/add-link-ai.service';
import { AddLinkFormService } from '../../services/add-link-form.service';

/**
 * The AI part under the Tags field of the add-link dialog (#390): "2 added by AI" with Undo, then
 * the one AI line (limit, "not available") or the tag suggestion row with its skeleton and "Add
 * all". Renders inside the dialog's field group; nothing while AI is off.
 */
@Component({
  selector: 'app-add-link-ai-tags',
  imports: [AiAppliedComponent, AiLineComponent, AiSuggestionRowComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-link-ai-tags.component.html',
  styleUrl: './add-link-ai.component.scss',
})
export class AddLinkAiTagsComponent {
  protected readonly AI_APPLIED_PART = AI_APPLIED_PART;
  protected readonly ai = inject(AddLinkAiService);
  protected readonly applied = inject(AddLinkAiAppliedService);
  private readonly form = inject(AddLinkFormService).form;

  /** The row is gone after a take or a dismiss: focus goes to the field. */
  protected focusField(): void {
    this.form.tags().focusBoundControl();
  }
}
