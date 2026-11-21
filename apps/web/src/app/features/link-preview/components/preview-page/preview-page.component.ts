import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ButtonComponent,
  FaviconComponent,
  ICON_SIZE,
  MenuComponent,
  MenuItemComponent,
  MenuTriggerDirective,
} from '@shelfmark/ui';
import { linkHost, ownImageUrl, siteLetter } from '../../../links/utils/link-view';
import { LinkPreviewService } from '../../services/link-preview.service';
import { PreviewBodyComponent } from '../preview-body/preview-body.component';

/**
 * The link preview below 80em (#553, `MobileLinkPreview.dc.html`): a page pushed over the feed
 * (the shell hides the tab bar while `?preview=` is set), Back returns to the feed where it was;
 * the header has the title and domain, open in browser and More; a floating glass bar has
 * favorite and share.
 */
@Component({
  selector: 'app-preview-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    FaviconComponent,
    MenuComponent,
    MenuItemComponent,
    MenuTriggerDirective,
    PreviewBodyComponent,
  ],
  templateUrl: './preview-page.component.html',
  styleUrl: './preview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewPageComponent {
  protected readonly preview = inject(LinkPreviewService);
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly domain = computed(() => {
    const link = this.preview.link();
    return link ? linkHost(link.url) : '';
  });
  protected readonly letter = computed(() => {
    const link = this.preview.link();
    return link ? siteLetter(link.url) : '';
  });
  protected readonly favicon = computed(() => ownImageUrl(this.preview.link()?.faviconUrl ?? null));
}
