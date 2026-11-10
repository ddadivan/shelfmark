import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RecentLinksPanelComponent } from './recent-links-panel.component';

/** `/recent`: the links the user opened last, as a page in the content area. */
@Component({
  selector: 'app-recent-page',
  imports: [TranslocoPipe, RecentLinksPanelComponent],
  templateUrl: './recent.page.html',
  styleUrl: './recent.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RecentPage {}
