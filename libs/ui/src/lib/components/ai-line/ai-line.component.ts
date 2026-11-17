import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BUTTON_SIZE } from '../button/models/button-size.const';
import { BUTTON_VARIANT } from '../button/models/button-variant.const';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';

/**
 * The quiet one-line status that stands in for AI content when it cannot appear (AiSummary spec):
 * the spark and one sentence in `text-muted`, saying what happened and what still works
 * ("Suggestions aren't available right now. Your link saves as usual."), and an optional ghost
 * button ("Try again", "AI settings"). Never red, never a toast: one per dialog or sheet.
 *
 * Presentational: `text` and `actionLabel` come translated; `action` fires on the button.
 */
@Component({
  selector: 'ui-ai-line',
  imports: [ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-ai-line' },
  templateUrl: './ai-line.component.html',
  styleUrl: './ai-line.component.scss',
})
export class AiLineComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  /** The sentence. */
  readonly text = input.required<string>();
  /** Label of the ghost button; no button when empty. */
  readonly actionLabel = input('');

  /** The ghost button was pressed. */
  readonly action = output<void>();
}
