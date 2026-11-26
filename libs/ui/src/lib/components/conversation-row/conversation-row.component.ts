import { TooltipDirective } from '../../directives/tooltip/tooltip.directive';
import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * One conversation of a chat history list (Shelf 11-ask, the Ask page's side list): its title on
 * one line with "…", the current one on `surface-hover` in 500 weight (`aria-current="page"`).
 *
 * **One activation target**, as in `ui-list-item`: the title is a native `<a href>` (or a
 * `<button>` without `href`) stretched over the row; `actions` (`slot="actions"`, for example a
 * delete icon button) sit above it, show on hover and keyboard focus (always with touch input) and
 * never activate the row. `activated` emits the click so the app may `preventDefault()` and route.
 */
@Component({
  selector: 'ui-conversation-row',
  imports: [NgTemplateOutlet, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-conversation-row',
    role: 'listitem',
    '[class.ui-conversation-row--current]': 'current()',
  },
  templateUrl: './conversation-row.component.html',
  styleUrl: './conversation-row.component.scss',
})
export class ConversationRowComponent {
  /** Makes the activation target an `<a href>`; without it a `<button type="button">`. */
  readonly href = input<string>();
  /** The open conversation (`aria-current="page"`). */
  readonly current = input(false, { transform: booleanAttribute });
  /**
   * The whole title as text: shown as a tooltip on hover or keyboard focus only while the
   * one-line title is cut (pointer devices). With touch the title wraps instead.
   */
  readonly fullTitle = input('');

  /** The row was activated (click, Enter or Space on the link or button). */
  readonly activated = output<MouseEvent>();
}
