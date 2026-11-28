import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BadgeComponent,
  ButtonComponent,
  ICON_SIZE,
  NumberFlowComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
} from '@shelfmark/ui';
import { APP_PATH } from '../../../../models/app-path.const';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { TidyCountStore } from '../../services/tidy-count.store';
import { TidyEntryCache } from '../../services/tidy-entry-cache.service';

/**
 * "Tidy with suggestions {n}" in the Unsorted header (`AiTidy` 1, AI-2): the secondary button with
 * the spark that opens Tidy Unsorted. Rendered only while AI is on and at least one link in
 * Unsorted has suggestions; it asks for the count when it appears. While the answer is out it holds
 * the button's slot as a skeleton if the button was there last time (`TidyEntryCache`).
 */
@Component({
  selector: 'app-tidy-entry',
  imports: [TranslocoPipe, BadgeComponent, ButtonComponent, NumberFlowComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tidy-entry.component.html',
  styleUrl: './tidy-entry.component.scss',
})
export class TidyEntryComponent {
  protected readonly settings = inject(AiSettingsStore);
  protected readonly count = inject(TidyCountStore);
  protected readonly cache = inject(TidyEntryCache);
  private readonly router = inject(Router);
  protected readonly href = `/${APP_PATH.Tidy}`;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;

  constructor() {
    void this.settings.load().then(() => this.count.load());
  }

  protected async open(event: MouseEvent): Promise<void> {
    event.preventDefault();
    await this.router.navigateByUrl(this.href);
  }
}
