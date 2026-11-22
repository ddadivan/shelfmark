import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
} from '@angular/core';
import type { IconSize } from '../icon/models/icon-size.type';

/**
 * The tick of a checked checkbox and a success toast, drawn as a stroke so it can draw itself
 * along its path (Motion, drawn check). Same look as the `check` icon (24px grid, 1.75 stroke, round
 * ends), same sizing as `ui-icon` (`--ui-icon-size`, `--ui-icon-scale`). Without `draw` it is just
 * there; with `draw` the stroke draws in 200 ms `ease-out` when the element is created
 * (`--ui-check-delay` waits first). Reduced motion: the tick shows at once. Decorative.
 */
@Component({
  selector: 'ui-check-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-check-mark',
    '[class.ui-check-mark--draw]': 'drawing()',
    '[class.ui-check-mark--20]': 'size() === 20',
    '[class.ui-check-mark--16]': 'size() === 16',
    'aria-hidden': 'true',
  },
  templateUrl: './check-mark.component.html',
  styleUrl: './check-mark.component.scss',
})
export class CheckMarkComponent {
  /** Size in design pixels, as for `ui-icon`. */
  readonly size = input<IconSize>(24);
  /** Draws the tick when the element is created; a later change of the input does nothing. */
  readonly draw = input(false, { transform: booleanAttribute });
  /** The first value of `draw`, kept: turning the class on later would start the animation late. */
  protected readonly drawing = linkedSignal<boolean, boolean>({
    source: this.draw,
    computation: (draw, previous) => previous?.value ?? draw,
  });
}
