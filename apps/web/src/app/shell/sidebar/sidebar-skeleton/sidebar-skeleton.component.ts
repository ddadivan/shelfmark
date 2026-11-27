import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SKELETON_SHAPE, SkeletonComponent } from '@shelfmark/ui';

/**
 * One section of the sidebar while its list loads (Pinned, Folders, Tags): the heading's bar in
 * the 32px heading row, then rows of the tree's own height (36px, icon, name, count). The group
 * rules above it (the hairline, the 24px gap) come from the sidebar that places it.
 */
@Component({
  selector: 'app-sidebar-skeleton',
  imports: [SkeletonComponent],
  templateUrl: './sidebar-skeleton.component.html',
  styleUrl: './sidebar-skeleton.component.scss',
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarSkeletonComponent {
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;

  /** Rows under the heading. */
  readonly rows = input(3);
  /** The heading bar's width in px; the headings differ ("Pinned", "Folders", "Tags"). */
  readonly heading = input(40);
}
