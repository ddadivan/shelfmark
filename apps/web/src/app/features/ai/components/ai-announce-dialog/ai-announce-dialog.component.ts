import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import { AI_ANNOUNCE_POINTS } from './models/ai-announce-points.const';

/**
 * The one-time AI announcement (AiAnnounce mockup, #507): "Shelfmark can now help with AI" with
 * four feature cards. "Turn on AI…" closes with `true` (the opener then shows the AI intro, where
 * the consent happens); "Not now", the close button, Esc and the scrim close with `false`. The
 * entrance (spark tile, title, cards one by one, a soft glow) is CSS and stands still under
 * reduced motion. `ui-dialog` draws it as a bottom sheet on a phone.
 */
@Component({
  selector: 'app-ai-announce-dialog',
  imports: [TranslocoPipe, ButtonComponent, DialogComponent],
  templateUrl: './ai-announce-dialog.component.html',
  styleUrl: './ai-announce-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAnnounceDialogComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly POINTS = AI_ANNOUNCE_POINTS;

  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);

  protected turnOn(): void {
    this.ref.close(true);
  }

  protected notNow(): void {
    this.ref.close(false);
  }
}
