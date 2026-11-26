import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  ButtonComponent,
  FaviconComponent,
  MenuTriggerDirective,
  PopoverTriggerDirective,
  SegmentedControlComponent,
  TooltipDirective,
  TooltipGroupDirective,
  type SegmentedOption,
} from '@shelfmark/ui';
import { linkAddress, ownImageUrl, siteColour, siteLetter } from '../../../links/utils/link-view';
import { SITE_COLOURS } from '../../../links/models/site-colours.const';
import { RelatedLinksComponent } from '../../../ai/components/related-links/related-links.component';
import { PREVIEW_MODE } from '../../models/preview-mode.const';
import type { PreviewMode } from '../../models/preview-mode.type';
import { LinkPreviewService } from '../../services/link-preview.service';
import { PreviewReaderService } from '../../services/preview-reader.service';
import { PreviewBodyComponent } from '../preview-body/preview-body.component';
import { PreviewDetailsComponent } from '../preview-details/preview-details.component';
import { PreviewMenuComponent } from '../preview-menu/preview-menu.component';
import { PreviewReaderComponent } from '../preview-reader/preview-reader.component';
import { ReadingSettingsComponent } from '../reading-settings/reading-settings.component';
import { PreviewNarrowDirective } from '../../directives/preview-narrow.directive';

/**
 * The Link page beside the list (Shelf `01-library.html`, #553): previous / next, the title with
 * favicon and address, then Site | Reader, Reading settings (Reader), Open, favorite, Details, the
 * ⋯ menu and, after a divider, × close on the right. The body is the site (frame, player, blocked)
 * or Reader, with the details panel beside it when open.
 */
@Component({
  selector: 'app-preview-panel',
  imports: [
    RelatedLinksComponent,
    TranslocoPipe,
    ButtonComponent,
    FaviconComponent,
    MenuTriggerDirective,
    PopoverTriggerDirective,
    SegmentedControlComponent,
    TooltipDirective,
    TooltipGroupDirective,
    PreviewBodyComponent,
    PreviewDetailsComponent,
    PreviewMenuComponent,
    PreviewReaderComponent,
    ReadingSettingsComponent,
    PreviewNarrowDirective,
  ],
  templateUrl: './preview-panel.component.html',
  styleUrl: './preview-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewPanelComponent {
  protected readonly preview = inject(LinkPreviewService);
  protected readonly reader = inject(PreviewReaderService);
  private readonly transloco = inject(TranslocoService);
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  protected readonly address = computed(() => {
    const link = this.preview.link();
    return link ? linkAddress(link.url) : '';
  });
  protected readonly letter = computed(() => {
    const link = this.preview.link();
    return link ? siteLetter(link.url) : '';
  });
  protected readonly colour = computed(() => {
    const link = this.preview.link();
    return link ? siteColour(link.url, SITE_COLOURS) : undefined;
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
