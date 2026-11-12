import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ViewportService } from '../../../core/layout/viewport.service';
import { APP_PATH } from '../../../models/app-path.const';
import { SidebarTagsComponent } from '../sidebar-tags/sidebar-tags.component';

/**
 * The Tags tab of the phone: the sidebar's tags section as a page (chips filter the feed through
 * `?tag=`, "+" creates, a long press or the chip's "..." opens rename, merge and delete). From the
 * tablet width the sidebar does this job, so the page leaves for All links.
 */
@Component({
  selector: 'app-tags-page',
  imports: [SidebarTagsComponent],
  templateUrl: './tags.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TagsPage {
  private readonly router = inject(Router);
  private readonly viewport = inject(ViewportService);

  constructor() {
    effect(() => {
      if (!this.viewport.compact()) {
        void this.router.navigateByUrl(`/${APP_PATH.Links}`, { replaceUrl: true });
      }
    });
  }
}
