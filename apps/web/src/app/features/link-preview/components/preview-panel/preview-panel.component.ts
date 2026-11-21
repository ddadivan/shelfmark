import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, FaviconComponent, ICON_SIZE, TooltipDirective } from '@shelfmark/ui';
import { linkAddress, ownImageUrl, siteLetter } from '../../../links/utils/link-view';
import { LinkPreviewService } from '../../services/link-preview.service';
import { PreviewBodyComponent } from '../preview-body/preview-body.component';

/**
 * The preview panel of the desktop split (#553, `LinkPreview.dc.html`): a toolbar with previous /
 * next, the title with favicon and address, favorite, edit, copy link, wider (hides the list),
 * Open (new tab) and close, then the body. The Site / Reader switch waits for Reader (#539).
 */
@Component({
  selector: 'app-preview-panel',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    FaviconComponent,
    TooltipDirective,
    PreviewBodyComponent,
  ],
  templateUrl: './preview-panel.component.html',
  styleUrl: './preview-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewPanelComponent {
  protected readonly preview = inject(LinkPreviewService);
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly address = computed(() => {
    const link = this.preview.link();
    return link ? linkAddress(link.url) : '';
  });
  protected readonly letter = computed(() => {
    const link = this.preview.link();
    return link ? siteLetter(link.url) : '';
  });
  protected readonly favicon = computed(() => ownImageUrl(this.preview.link()?.faviconUrl ?? null));
}
