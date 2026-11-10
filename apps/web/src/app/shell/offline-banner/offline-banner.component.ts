import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { NoticeComponent, NOTICE_KIND } from '@shelfmark/ui';
import { OnlineService } from '../../core/network/online.service';

/**
 * Strip above the app header while the browser is offline (PROJECT.md 5.1): what is loaded can
 * still be browsed; saving and editing come back with the connection. It goes away by itself.
 */
@Component({
  selector: 'app-offline-banner',
  imports: [TranslocoPipe, NoticeComponent],
  templateUrl: './offline-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineBannerComponent {
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly network = inject(OnlineService);
}
