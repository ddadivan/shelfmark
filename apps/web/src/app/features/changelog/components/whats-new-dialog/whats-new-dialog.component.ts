import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  injectDialogData,
  ReducedMotion,
  UiDialogRef,
} from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { APP_PATH } from '../../../../models/app-path.const';
import type { WhatsNewDialogData } from '../../models/whats-new-dialog-data.interface';

/**
 * The "What's new" card (#424): the highlights of the releases since the last visit, each a title
 * and a short text, with an image or one short silent loop when the release has one (the poster
 * only under reduced motion). "See all changes" opens `/changelog`, "Got it" closes.
 */
@Component({
  selector: 'app-whats-new-dialog',
  imports: [ButtonComponent, DialogComponent, NgOptimizedImage, TranslocoPipe],
  templateUrl: './whats-new-dialog.component.html',
  styleUrl: './whats-new-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsNewDialogComponent {
  private readonly ref = inject<UiDialogRef<undefined>>(UiDialogRef);
  private readonly router = inject(Router);
  protected readonly highlights = injectDialogData<WhatsNewDialogData>().highlights;
  protected readonly reducedMotion = inject(ReducedMotion).reduced;
  protected readonly phone = inject(ViewportService).phone;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  protected close(): void {
    this.ref.close();
  }

  protected async seeAll(): Promise<void> {
    this.ref.close();
    await this.router.navigateByUrl(`/${APP_PATH.Changelog}`);
  }
}
