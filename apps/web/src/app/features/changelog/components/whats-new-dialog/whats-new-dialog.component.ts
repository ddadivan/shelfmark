import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  injectDialogData,
  UiDialogRef,
} from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { ThemeService } from '../../../../core/theme/theme.service';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { APP_PATH } from '../../../../models/app-path.const';
import { changelogImageSrc } from '../../utils/changelog-image-src';
import type { ChangelogImage } from '../../models/changelog-image.interface';
import type { WhatsNewDialogData } from '../../models/whats-new-dialog-data.interface';

/**
 * The "What's new" card (#424, #442): the priority 1 feature of the releases since the last visit
 * first and large, with its screenshot for the current theme, then up to three more as small cards
 * (a title and a line), then "And N more improvements and fixes" linking to `/changelog` (left out
 * when N is 0). "See all changes" opens `/changelog`, "Got it" closes.
 */
@Component({
  selector: 'app-whats-new-dialog',
  imports: [ButtonComponent, DialogComponent, NgOptimizedImage, RouterLink, TranslocoPipe],
  templateUrl: './whats-new-dialog.component.html',
  styleUrl: './whats-new-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsNewDialogComponent {
  private readonly ref = inject<UiDialogRef<undefined>>(UiDialogRef);
  private readonly router = inject(Router);
  private readonly data = injectDialogData<WhatsNewDialogData>();
  private readonly theme = inject(ThemeService);
  protected readonly top = computed(() => this.data.highlights[0]);
  protected readonly others = computed(() => this.data.highlights.slice(1));
  protected readonly moreCount = this.data.moreCount;
  /** The plural key of "And N more…" in the active language; none when nothing is left out. */
  protected readonly moreKey = computed(() =>
    this.moreCount > 0 ? pluralKey('whatsNew.more', this.moreCount) : null,
  );
  protected readonly changelogHref = `/${APP_PATH.Changelog}`;
  protected readonly phone = inject(ViewportService).phone;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  protected imageSrc(image: ChangelogImage): string {
    return changelogImageSrc(image, this.theme.resolved());
  }

  protected close(): void {
    this.ref.close();
  }

  protected async seeAll(): Promise<void> {
    this.ref.close();
    await this.router.navigateByUrl(`/${APP_PATH.Changelog}`);
  }
}
