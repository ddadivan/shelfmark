import { CdkDrag, CdkDragPlaceholder, CdkDragPreview, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BadgeComponent,
  ButtonComponent,
  LoadMoreComponent,
  PanelComponent,
  PickerListComponent,
  PickerMenuComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
} from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { DragSlotComponent } from '../../../links/components/drag-slot/drag-slot.component';
import { LinkCardComponent } from '../../../links/components/link-card/link-card.component';
import { InViewDirective } from '../../../links/directives/in-view.directive';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { LinkDragService } from '../../../links/services/link-drag.service';
import { LibraryDragService } from '../../services/library-drag.service';
import { SplitFeedStore } from '../../services/split-feed.store';
import { SplitViewService } from '../../services/split-view.service';

/** Number of placeholders shown while the first page loads. */
const SKELETON_COUNT = 4;

/**
 * The right half of the side-by-side view (#386): the picker that asks for a folder, then the
 * links of that folder (or Unsorted) as read-only cards. A card opens on click and can be dragged
 * to the left half or the sidebar, one link at a time; it has no checkbox and no menu, because
 * those work on the left feed (ADR 0044). The half is a drop target (`data-link-drop-folder`): a
 * dragged link over it shows an accent ring and "Move here". Page-scoped state lives in
 * `SplitViewService` and `SplitFeedStore`.
 */
@Component({
  selector: 'app-split-right-half',
  imports: [
    CdkDrag,
    CdkDragPlaceholder,
    CdkDragPreview,
    CdkDropList,
    TranslocoPipe,
    BadgeComponent,
    ButtonComponent,
    DragSlotComponent,
    InViewDirective,
    LinkCardComponent,
    LoadMoreComponent,
    PanelComponent,
    PickerListComponent,
    PickerMenuComponent,
    SkeletonComponent,
  ],
  templateUrl: './split-right-half.component.html',
  styleUrl: './split-right-half.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitRightHalfComponent {
  protected readonly split = inject(SplitViewService);
  protected readonly feed = inject(SplitFeedStore);
  protected readonly drag = inject(LinkDragService);
  protected readonly dnd = inject(LibraryDragService);
  protected readonly actions = inject(LinkActionsService);
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly SKELETON_COUNT = SKELETON_COUNT;
  protected readonly pluralKey = pluralKey;

  /** Loads the first page of the target again (the error state's button). */
  protected retry(): void {
    this.feed.show(this.split.rightTarget());
  }
}
