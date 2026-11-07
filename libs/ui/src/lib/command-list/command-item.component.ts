import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { CommandGroupComponent } from './command-group.component';

let nextItemId = 0;

/**
 * One choice of `ui-command-list` (an option of its listbox). The projected content is the row:
 * the default slot is the title, `slot="leading"` an icon or favicon, `slot="meta"` the secondary
 * line and `slot="trailing"` a hint or count. The list renders the row inside its listbox (the
 * options must live under the listbox element), so this element itself stays empty.
 *
 * The option is named by its content; keep it to text (a `ui-highlight` is fine).
 */
@Component({
  selector: 'ui-command-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-command-item', hidden: '' },
  templateUrl: './command-item.component.html',
})
export class CommandItemComponent {
  /** Identifies the item in `selected`; unique inside the list. */
  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  /** DOM id of the option; Aria's `aria-activedescendant` points at it. */
  readonly id = `ui-command-item-${nextItemId++}`;
  /** The group the item sits in, if any. */
  readonly group = inject(CommandGroupComponent, { optional: true });

  /** The row, rendered by the list. */
  readonly body = viewChild.required<TemplateRef<unknown>>('body');
}
