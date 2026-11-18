import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SUMMARY_SOURCE } from '@shelfmark/contracts';
import { ICON_SIZE, IconComponent, SkeletonComponent } from '@shelfmark/ui';
import { summaryPendingMs } from '../../utils/summary-pending-ms';
import type { LinkSummaryItem } from './models/link-summary-item.type';

/**
 * A link's summary in the note slot of a card (two lines) or the meta line of a row (one line),
 * `AiSummary` mockup: plain text by interpolation only, with the spark while AI wrote it (its
 * accessible name and tooltip carry the disclaimer). Right after a save, while the AI job is
 * pending and the link is younger than `AI_LIMIT.PendingSkeletonMs`, skeleton lines stand in;
 * the text then fades in. Renders nothing for no summary (failed, skipped, AI off).
 */
@Component({
  selector: 'app-link-summary',
  imports: [IconComponent, SkeletonComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.link-summary--row]': 'row()' },
  templateUrl: './link-summary.component.html',
  styleUrl: './link-summary.component.scss',
})
export class LinkSummaryComponent {
  protected readonly ICON_SIZE = ICON_SIZE;

  readonly link = input.required<LinkSummaryItem>();
  /** One line in a list row instead of two in a card. */
  readonly row = input(false, { transform: booleanAttribute });

  /** The skeleton window has passed (set by a timer while it is open). */
  private readonly expired = signal(false);

  protected readonly pending = computed(
    () =>
      !this.expired() &&
      !this.link().summary &&
      summaryPendingMs(this.link().aiStatus, this.link().createdAt, Date.now()) > 0,
  );
  protected readonly text = computed(() => this.link().summary ?? '');
  protected readonly byAi = computed(() => this.link().summarySource === SUMMARY_SOURCE.Ai);
  /** The text replaced the skeleton: it fades in (only then, not on every load). */
  protected readonly revealed = signal(false);

  constructor() {
    effect((onCleanup) => {
      const link = this.link();
      const left = summaryPendingMs(link.aiStatus, link.createdAt, Date.now());
      this.expired.set(false);
      if (left <= 0) {
        return;
      }
      if (!link.summary) {
        this.revealed.set(true);
      }
      const timer = setTimeout(() => this.expired.set(true), left);
      onCleanup(() => clearTimeout(timer));
    });
  }
}
