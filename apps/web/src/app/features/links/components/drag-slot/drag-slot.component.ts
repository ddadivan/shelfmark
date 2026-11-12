import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ICON_SIZE, IconComponent } from '@shelfmark/ui';

/**
 * The empty slot of a link that is being dragged (DragDrop spec): every carried link (the grabbed
 * one, as the CDK placeholder, and each selected link that travels with it, laid over its card)
 * shows the same state at the card's exact size — a soft accent tint, a dashed outline, a round
 * accent tile with the move glyph, "Moving" and the link's title. The list view gets a one-line
 * version. Decorative: the feed announces the drag in its live region.
 */
@Component({
  selector: 'app-drag-slot',
  imports: [IconComponent, TranslocoPipe],
  templateUrl: './drag-slot.component.html',
  styleUrl: './drag-slot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[class.drag-slot--compact]': 'compact()',
  },
})
export class DragSlotComponent {
  /** Title of the link that left this slot. */
  readonly title = input.required<string>();
  /** The list view: a one-line row ("Moving · title") instead of the centred card state. */
  readonly compact = input(false);

  protected readonly ICON_SIZE = ICON_SIZE;
}
