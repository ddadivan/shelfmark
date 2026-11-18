import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DUPLICATE_REASON } from '@shelfmark/contracts';
import { BadgeComponent, CheckboxComponent, TooltipDirective } from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { LocaleService } from '../../../../core/i18n/locale.service';
import type { CleanupDuplicateRow } from '../../models/cleanup-duplicate-row.interface';

/**
 * One duplicate group of the clean-up report (`AiCleanup` 1): a checkbox with the kept link's
 * title, the line that says which copy stays, why, and how many go to Trash, and the "Same address"
 * or "Same page" badge (with the spark for groups found by AI).
 */
@Component({
  selector: 'app-cleanup-duplicate-row',
  imports: [TranslocoPipe, BadgeComponent, CheckboxComponent, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cleanup-duplicate-row.component.html',
  styleUrl: './cleanup-duplicate-row.component.scss',
})
export class CleanupDuplicateRowComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleService);

  readonly row = input.required<CleanupDuplicateRow>();
  /** The checkbox changed: `true` = the copies go to Trash on apply. */
  readonly toggled = output<boolean>();

  protected readonly reasonKey = computed(() =>
    this.row().reason === DUPLICATE_REASON.SamePage
      ? 'cleanup.reason.samePage'
      : 'cleanup.reason.sameAddress',
  );

  /** "Saved 3 times: keep the one in Clothes (it is in a folder), move 2 copies to Trash". */
  protected readonly detail = computed(() => {
    const row = this.row();
    const count = row.copies;
    const why = this.transloco.translate(`cleanup.keep.${row.keepReason}`);
    const [keepHost = ''] = row.hosts;
    if (row.reason === DUPLICATE_REASON.SamePage && row.hosts.length > 1) {
      return this.transloco.translate(pluralKey('cleanup.duplicate.samePage', count), {
        hosts: new Intl.ListFormat(this.locale.locale(), { type: 'conjunction' }).format(row.hosts),
        keep: keepHost,
        why,
        count,
      });
    }
    return this.transloco.translate(pluralKey('cleanup.duplicate.sameAddress', count), {
      saved: count + 1,
      place: row.place ?? this.transloco.translate('cleanup.unsorted'),
      why,
      count,
    });
  });
}
