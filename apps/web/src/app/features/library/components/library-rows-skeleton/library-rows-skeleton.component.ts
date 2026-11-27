import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SKELETON_SHAPE, SkeletonComponent } from '@shelfmark/ui';

/** Rows drawn for the List view: 72px apart, a little more than a tall window shows. */
const LIST_ROWS = 12;
/** Rows drawn for Headlines: 41px apart. */
const HEADLINE_ROWS = 22;

/**
 * The loading state of the List and Headlines views, the size of the loaded rows (`ui-list-item`
 * with the 72 x 48 picture, and the 40px headline row in its surface panel) so the links replace it
 * without a jump. The static boot skeleton (`index.html`, `.boot__rows`) repeats these sizes.
 */
@Component({
  selector: 'app-library-rows-skeleton',
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './library-rows-skeleton.component.html',
  styleUrl: './library-rows-skeleton.component.scss',
  host: { '[class.rows-sk--headlines]': 'headlines()' },
})
export class LibraryRowsSkeletonComponent {
  /** Headline rows in a panel instead of list rows. */
  readonly headlines = input(false);

  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly rows = computed(() =>
    Array.from({ length: this.headlines() ? HEADLINE_ROWS : LIST_ROWS }, (_, index) => index),
  );
}
