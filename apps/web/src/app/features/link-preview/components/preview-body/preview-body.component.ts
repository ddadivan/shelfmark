import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ButtonComponent,
  CheckboxComponent,
  EmptyStateComponent,
  PreviewFrameComponent,
  ProgressBarComponent,
} from '@shelfmark/ui';
import { PREVIEW_BODY_KIND } from '../../models/preview-body-kind.const';
import { PREVIEW_FRAME_TIMEOUT_MS } from '../../models/preview-frame-timeout-ms.const';
import { PREVIEW_MODE } from '../../models/preview-mode.const';
import { LinkPreviewService } from '../../services/link-preview.service';
import { PreviewReaderService } from '../../services/preview-reader.service';

/**
 * The body of the link preview (#553), shared by the desktop panel and the pushed page: the site
 * in the sandboxed `ui-preview-frame` (it keeps its own look in the dark theme), the
 * `youtube-nocookie` player, or the "doesn't allow showing it here" state with "Open in Reader",
 * "Open in browser"
 * and "Always open <domain> in a new tab". The blocked state offers Reader first (Shelf).
 */
@Component({
  selector: 'app-preview-body',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    CheckboxComponent,
    EmptyStateComponent,
    PreviewFrameComponent,
    ProgressBarComponent,
  ],
  templateUrl: './preview-body.component.html',
  styleUrl: './preview-body.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewBodyComponent {
  protected readonly preview = inject(LinkPreviewService);
  protected readonly reader = inject(PreviewReaderService);
  protected readonly MODE = PREVIEW_MODE;
  protected readonly KIND = PREVIEW_BODY_KIND;
  protected readonly TIMEOUT_MS = PREVIEW_FRAME_TIMEOUT_MS;
}
