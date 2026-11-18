import { ChangeDetectionStrategy, Component, computed, inject, model } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { SegmentedControlComponent, type SegmentedOption } from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { RediscoverStore } from '../../../rediscover/services/rediscover.store';
import { RECENT_VIEW } from '../../models/recent-view.const';
import type { RecentView } from '../../models/recent-view.type';

/**
 * The "Opened · Forgotten" switch of Recently opened (#512), the same on the page and in the
 * phone sheet; Forgotten carries its count once the Rediscover block has loaded. The owner keeps
 * the value (the page in the URL, the sheet in a signal).
 */
@Component({
  selector: 'app-recent-view-switch',
  imports: [SegmentedControlComponent],
  template: `<ui-segmented-control
    [options]="options()"
    [value]="value()"
    [ariaLabel]="label()"
    (valueChange)="select($event)"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentViewSwitchComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly rediscover = inject(RediscoverStore);
  readonly value = model<RecentView>(RECENT_VIEW.Opened);

  protected readonly label = computed(() => {
    activeLang(); // re-translate on a language switch
    return this.transloco.translate('rediscover.segment.label');
  });

  protected readonly options = computed<SegmentedOption[]>(() => {
    activeLang(); // re-translate on a language switch
    const count = this.rediscover.count();
    return [
      { value: RECENT_VIEW.Opened, label: this.transloco.translate('rediscover.segment.opened') },
      {
        value: RECENT_VIEW.Forgotten,
        label:
          count > 0
            ? this.transloco.translate('rediscover.segment.forgottenCount', { count })
            : this.transloco.translate('rediscover.segment.forgotten'),
      },
    ];
  });

  constructor() {
    void this.rediscover.load();
  }

  protected select(value: string): void {
    this.value.set(value === RECENT_VIEW.Forgotten ? RECENT_VIEW.Forgotten : RECENT_VIEW.Opened);
  }
}
