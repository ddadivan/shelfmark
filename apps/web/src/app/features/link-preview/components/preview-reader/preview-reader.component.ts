import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LINK_KIND, SUMMARY_SOURCE } from '@shelfmark/contracts';
import {
  ButtonComponent,
  ICON_SIZE,
  IconComponent,
  ProgressBarComponent,
  ReaderComponent,
} from '@shelfmark/ui';
import { linkHost, ownImageUrl, siteColour, siteLetter } from '../../../links/utils/link-view';
import { SITE_COLOURS } from '../../../links/models/site-colours.const';
import { LinkPreviewService } from '../../services/link-preview.service';
import { PreviewReaderService } from '../../services/preview-reader.service';

/**
 * Reader on the Link page (Shelf `01-library.html`): the article as clean text with the summary on
 * top, or, for a page without article text, the link's own picture, its description (the summary)
 * and the person's note with "Open <site>". The reading settings and the scroll progress go to
 * `PreviewReaderService`.
 */
@Component({
  selector: 'app-preview-reader',
  imports: [TranslocoPipe, ButtonComponent, IconComponent, ProgressBarComponent, ReaderComponent],
  templateUrl: './preview-reader.component.html',
  styleUrl: './preview-reader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewReaderComponent {
  protected readonly preview = inject(LinkPreviewService);
  protected readonly reader = inject(PreviewReaderService);
  protected readonly ICON_SIZE = ICON_SIZE;
  private readonly view = viewChild(ReaderComponent);

  protected readonly site = computed(() => {
    const link = this.preview.link();
    return link ? linkHost(link.url) : '';
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
  protected readonly image = computed(() => ownImageUrl(this.preview.link()?.imageUrl ?? null));
  protected readonly imageRatio = computed(() =>
    this.preview.link()?.kind === LINK_KIND.Video ? '16 / 9' : '4 / 3',
  );
  /** The summary was written by AI (the spark mark, `ai.disclaimer`). */
  protected readonly aiSummary = computed(
    () => this.preview.link()?.summarySource === SUMMARY_SOURCE.Ai,
  );

  constructor() {
    // A new link starts at the top of its text.
    effect(() => {
      this.preview.currentId();
      untracked(() => this.view()?.scrollToStart());
    });
  }
}
