import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';
import { SKELETON_SHAPE } from './models/skeleton-shape.const';
import type { SkeletonShape } from './models/skeleton-shape.type';

/** Upper bound for `count`, so a bad binding cannot render thousands of nodes. */
const MAX_COUNT = 50;

/**
 * Placeholder for content on its first load, in the shape of the real thing: `card`
 * (matches `ui-card`), `row` (`ui-list-item`), `tree` (`ui-tree`), `preview` (the link preview
 * box) or `line` (text). `count` repeats it (12 to 16 cards, 8 rows, 5 folders fill a typical screen).
 * Line widths cycle 90 / 70 / 50% so the blocks read as text. The shimmer stops under
 * `prefers-reduced-motion`. It is `aria-hidden`: the consumer marks its container
 * `aria-busy="true"` and announces the loading itself. `card` has no box of its own
 * (`display: contents`), so the cards sit in the consumer's grid. `block` is one plain box for
 * a layout no other shape covers: the consumer sizes it with `--ui-skeleton-width`,
 * `--ui-skeleton-height` (or `auto` with `--ui-skeleton-aspect`) and `--ui-skeleton-radius` on the host. `history` is a `ui-history-row`
 * (preview, two lines, the time at the end; `selectable` adds the checkbox) and reads the row's own
 * `--ui-history-row-preview-width|height`, so it fits a flat group and a card group alike.
 * When the data arrives, the content fades in (200 ms): give `ui-card` / `ui-list-item` `reveal`.
 */
@Component({
  selector: 'ui-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-skeleton',
    'aria-hidden': 'true',
    '[class.ui-skeleton--card]': 'shape() === SKELETON_SHAPE.Card',
    '[class.ui-skeleton--row]': 'shape() === SKELETON_SHAPE.Row',
    '[class.ui-skeleton--tree]': 'shape() === SKELETON_SHAPE.Tree',
    '[class.ui-skeleton--preview]': 'shape() === SKELETON_SHAPE.Preview',
    '[class.ui-skeleton--line]': 'shape() === SKELETON_SHAPE.Line',
    '[class.ui-skeleton--block]': 'shape() === SKELETON_SHAPE.Block',
    '[class.ui-skeleton--history]': 'shape() === SKELETON_SHAPE.History',
  },
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
})
export class SkeletonComponent {
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;

  readonly shape = input<SkeletonShape>(SKELETON_SHAPE.Line);
  /** How many placeholders to render (1 to 50). */
  readonly count = input(1, { transform: numberAttribute });
  /** `history` only: a checkbox before the preview, as the Trash rows have on desktop. */
  readonly selectable = input(false, { transform: booleanAttribute });

  protected readonly items = computed(() => {
    const n = Math.min(MAX_COUNT, Math.max(0, Math.floor(this.count()) || 0));
    return Array.from({ length: n }, (_, i) => i);
  });
}
