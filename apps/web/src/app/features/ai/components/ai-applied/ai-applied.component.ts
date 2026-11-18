import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BadgeComponent, BUTTON_SIZE, BUTTON_VARIANT, ButtonComponent } from '@shelfmark/ui';

/**
 * The "Moved by AI" / "2 added by AI" mark with Undo under a field of Edit link (`AiTags` 11): what
 * Automatic mode applied while it can still be undone. The dialog hides it once the user keeps or
 * changes the field. Texts come translated.
 */
@Component({
  selector: 'app-ai-applied',
  imports: [BadgeComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-applied.component.html',
  styleUrl: './ai-applied.component.scss',
})
export class AiAppliedComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  /** "Moved by AI", "2 added by AI". */
  readonly label = input.required<string>();
  readonly undoLabel = input.required<string>();
  /** Name of the Undo button for screen readers ("Undo: moved by AI"). */
  readonly undoAriaLabel = input('');
  /** The undo runs: the button shows its spinner. */
  readonly busy = input(false);

  readonly undo = output<void>();
}
