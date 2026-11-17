import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AI_APPLIED_PART } from '@shelfmark/contracts';
import { AiAppliedComponent } from '../../../ai/components/ai-applied/ai-applied.component';
import { AiSuggestionRowComponent } from '../../../ai/components/suggestion-rows/ai-suggestion-row.component';
import { AddLinkAiAppliedService } from '../../services/add-link-ai-applied.service';
import { AddLinkAiService } from '../../services/add-link-ai.service';
import { AddLinkFormService } from '../../services/add-link-form.service';

/**
 * The AI part under the Folder field of the add-link dialog (#390): "Moved by AI" with Undo and the
 * folder suggestion row. Renders inside the dialog's field group; nothing while AI is off.
 */
@Component({
  selector: 'app-add-link-ai-folder',
  imports: [AiAppliedComponent, AiSuggestionRowComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-link-ai-folder.component.html',
  styleUrl: './add-link-ai.component.scss',
})
export class AddLinkAiFolderComponent {
  protected readonly AI_APPLIED_PART = AI_APPLIED_PART;
  protected readonly ai = inject(AddLinkAiService);
  protected readonly applied = inject(AddLinkAiAppliedService);
  private readonly form = inject(AddLinkFormService).form;

  /** The row is gone after a take or a dismiss: focus goes to the field. */
  protected focusField(): void {
    this.form.folderId().focusBoundControl();
  }
}
