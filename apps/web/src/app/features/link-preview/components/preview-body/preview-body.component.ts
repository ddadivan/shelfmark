import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PREVIEW_CLICK_SETTINGS } from '../../models/preview-click-settings.const';
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
import { LinkPreviewService } from '../../services/link-preview.service';

/**
 * The body of the link preview (#553), shared by the desktop panel and the pushed page: the site
 * in the sandboxed `ui-preview-frame` (it keeps its own look in the dark theme), the
 * `youtube-nocookie` player, or the "doesn't open inside other apps" state with "Open in new tab"
 * and "Always open <domain> in a new tab". Reader (#539) is not offered until it ships.
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
  /** "Always open <domain> in a new tab" shows only while the click settings are on (#555). */
  protected readonly clickSettings = inject(PREVIEW_CLICK_SETTINGS);
  protected readonly KIND = PREVIEW_BODY_KIND;
  protected readonly TIMEOUT_MS = PREVIEW_FRAME_TIMEOUT_MS;
}
