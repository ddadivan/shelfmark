import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DRAWER_SIDE, DrawerComponent } from '@shelfmark/ui';
import { RecentLinksPanelComponent } from './recent-links-panel.component';

/**
 * "Recently opened" as a side panel that slides in from the inline-end edge, for the tablet
 * range (40em to 64em) where the inline column has no room. `RecentLinksDrawerService` opens it.
 */
@Component({
  selector: 'app-recent-links-drawer',
  imports: [DrawerComponent, RecentLinksPanelComponent, TranslocoPipe],
  templateUrl: './recent-links-drawer.component.html',
  styleUrl: './recent-links-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentLinksDrawerComponent {
  protected readonly DRAWER_SIDE = DRAWER_SIDE;
}
