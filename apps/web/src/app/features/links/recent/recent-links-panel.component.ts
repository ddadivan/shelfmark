import { booleanAttribute, ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  FaviconComponent,
  ListItemComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
} from '@shelfmark/ui';
import { LinksStore } from '../../../stores/links.store';
import { LinkActionsService } from '../link-actions.service';
import { linkHost, safeHref, siteLetter } from '../link-view';

/** Number of placeholders shown while the recent links load. */
const SKELETON_COUNT = 4;

/** "Recently opened": the last links the user opened, newest first, in the app shell. */
@Component({
  selector: 'app-recent-links-panel',
  imports: [TranslocoPipe, FaviconComponent, ListItemComponent, SkeletonComponent],
  templateUrl: './recent-links-panel.component.html',
  styleUrl: './recent-links-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentLinksPanelComponent {
  /** Off where a dialog title already names the list (the phone sheet). */
  readonly showTitle = input(true, { transform: booleanAttribute });

  protected readonly store = inject(LinksStore);
  protected readonly actions = inject(LinkActionsService);

  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly SKELETON_COUNT = SKELETON_COUNT;

  protected readonly safeHref = safeHref;
  protected readonly linkHost = linkHost;
  protected readonly siteLetter = siteLetter;

  constructor() {
    void this.store.loadRecent();
  }
}
