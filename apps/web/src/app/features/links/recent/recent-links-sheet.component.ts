import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DialogComponent } from '@shelfmark/ui';
import { RecentLinksPanelComponent } from './recent-links-panel.component';

/** "Recently opened" in a dialog (a bottom sheet on a phone), where the side panel has no room. */
@Component({
  selector: 'app-recent-links-sheet',
  imports: [DialogComponent, RecentLinksPanelComponent, TranslocoPipe],
  templateUrl: './recent-links-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentLinksSheetComponent {}
