import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ButtonComponent,
  EmptyStateComponent,
  FaviconComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
} from '@shelfmark/ui';
import { AccountStatsService } from '../../services/account-stats.service';

/**
 * The "Your shelf" card of the Account page (#352): counts of links, folders and tags, the oldest
 * link, the sites saved most, the most used tags and links added per week (last 12 weeks). The
 * chart is a list of bars, each with its week and count as text for screen readers. Reads the
 * page's `AccountStatsService`.
 */
@Component({
  selector: 'app-account-shelf',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    EmptyStateComponent,
    FaviconComponent,
    SkeletonComponent,
  ],
  templateUrl: './account-shelf.component.html',
  styleUrl: './account-shelf.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountShelfComponent {
  protected readonly stats = inject(AccountStatsService);
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
}
