import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  ButtonComponent,
  FaviconComponent,
  ICON_SIZE,
  MenuTriggerDirective,
  PopoverTriggerDirective,
  SegmentedControlComponent,
  type SegmentedOption,
} from '@shelfmark/ui';
import { linkHost, ownImageUrl, siteLetter } from '../../../links/utils/link-view';
import { RelatedLinksComponent } from '../../../ai/components/related-links/related-links.component';
import { LinkPreviewService } from '../../services/link-preview.service';
import { PREVIEW_MODE } from '../../models/preview-mode.const';
import type { PreviewMode } from '../../models/preview-mode.type';
import { PreviewReaderService } from '../../services/preview-reader.service';
import { PreviewBodyComponent } from '../preview-body/preview-body.component';
import { PreviewDetailsComponent } from '../preview-details/preview-details.component';
import { PreviewMenuComponent } from '../preview-menu/preview-menu.component';
import { PreviewReaderComponent } from '../preview-reader/preview-reader.component';
import { ReadingSettingsComponent } from '../reading-settings/reading-settings.component';

/**
 * The link preview below 80em (#553, `MobileLinkPreview.dc.html`): a page pushed over the feed
 * (the shell hides the tab bar while `?preview=` is set), Back returns to the feed where it was;
 * the header has the title and domain, open in browser and More; under it Site | Reader, Reading
 * settings and Details (the details panel shows under the page); a floating bar has favorite,
 * share and related links.
 */
@Component({
  selector: 'app-preview-page',
  imports: [
    RelatedLinksComponent,
    TranslocoPipe,
    ButtonComponent,
    FaviconComponent,
    MenuTriggerDirective,
    PopoverTriggerDirective,
    SegmentedControlComponent,
    PreviewBodyComponent,
    PreviewDetailsComponent,
    PreviewMenuComponent,
    PreviewReaderComponent,
    ReadingSettingsComponent,
  ],
  templateUrl: './preview-page.component.html',
  styleUrl: './preview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewPageComponent {
  protected readonly preview = inject(LinkPreviewService);
  protected readonly reader = inject(PreviewReaderService);
  private readonly transloco = inject(TranslocoService);
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });
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
  protected readonly modes = computed<SegmentedOption[]>(() => {
    this.i18n();
    return [
      { value: PREVIEW_MODE.Site, label: this.transloco.translate('preview.mode.site') },
      { value: PREVIEW_MODE.Reader, label: this.transloco.translate('preview.mode.reader') },
    ];
  });

  protected setMode(mode: string): void {
    this.reader.setMode(mode as PreviewMode);
  }
}
