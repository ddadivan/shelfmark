import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  BadgeComponent,
  ButtonComponent,
  CheckboxComponent,
  TooltipDirective,
} from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import type { CleanupTagRow } from '../../models/cleanup-tag-row.interface';

/**
 * One similar-tags pair of the clean-up report (`AiCleanup` 1): a checkbox "{keep} ← {merge}", the
 * line that says how many links get the kept tag, "Found by AI" on model pairs, and "Keep “{merge}”
 * instead", which turns the pair round.
 */
@Component({
  selector: 'app-cleanup-tag-row',
  imports: [TranslocoPipe, BadgeComponent, ButtonComponent, CheckboxComponent, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cleanup-tag-row.component.html',
  styleUrl: './cleanup-tag-row.component.scss',
})
export class CleanupTagRowComponent {
  private readonly transloco = inject(TranslocoService);

  readonly row = input.required<CleanupTagRow>();
  /** The checkbox changed: `true` = the pair is merged on apply. */
  readonly toggled = output<boolean>();
  /** "Keep … instead". */
  readonly swapped = output<void>();

  /** "14 links get “javascript”; “js” is removed". */
  protected readonly detail = computed(() => {
    const { keep, merge } = this.row();
    return this.transloco.translate(pluralKey('cleanup.tagPair.detail', merge.links), {
      count: merge.links,
      keep: keep.name,
      merge: merge.name,
    });
  });
}
