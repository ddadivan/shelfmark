import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ButtonComponent, IconComponent, ICON_SIZE, PanelComponent } from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { CLEANUP_HREF } from '../../models/cleanup-href.const';
import { CleanupSummaryStore } from '../../services/cleanup-summary.store';

/**
 * The clean-up entry card on All links (`AiCleanup` 2): "Your library could use a tidy-up", what was
 * found, Review (the clean-up page) and a × that hides it for a month. Shown only when the summary
 * says so; renders nothing otherwise.
 */
@Component({
  selector: 'app-cleanup-card',
  imports: [TranslocoPipe, ButtonComponent, IconComponent, PanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cleanup-card.component.html',
  styleUrl: './cleanup-card.component.scss',
})
export class CleanupCardComponent {
  protected readonly store = inject(CleanupSummaryStore);
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  protected readonly href = CLEANUP_HREF;
  protected readonly ICON_SIZE = ICON_SIZE;

  /** "3 duplicates and 2 pairs of similar tags" (the parts that are not 0). */
  protected readonly items = computed(() => {
    const summary = this.store.summary();
    if (!summary) {
      return '';
    }
    const parts = [
      ['cleanup.card.duplicates', summary.duplicates],
      ['cleanup.card.similarTags', summary.similarTags],
    ] as const;
    return new Intl.ListFormat(this.locale.locale(), { type: 'conjunction' }).format(
      parts
        .filter(([, count]) => count > 0)
        .map(([key, count]) => this.transloco.translate(pluralKey(key, count), { count })),
    );
  });

  constructor() {
    void this.store.load();
  }

  protected async review(event: MouseEvent): Promise<void> {
    event.preventDefault();
    await this.router.navigateByUrl(this.href);
  }
}
