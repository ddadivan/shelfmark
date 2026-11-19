import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AI_BACKFILL_STATE } from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  ButtonComponent,
  MeterComponent,
  NOTICE_KIND,
  NoticeComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
} from '@shelfmark/ui';
import { FragmentTargetDirective } from '../../../../core/layout/fragment-target.directive';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { AI_BACKFILL_FRAGMENT } from '../../../settings/models/ai-backfill-fragment.const';
import { AiSettingsActions } from '../../services/ai-settings-actions.service';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { aiResetDate } from '../../utils/ai-reset-date';

/**
 * "This month" of Settings › AI: links used of the monthly limit with the reset date (a warning
 * once the limit is reached), and "Process existing links" where the tier has a backfill allowance:
 * start, progress with Stop and the time left, or done. Numbers and dates follow the app language.
 */
@Component({
  selector: 'app-ai-usage-section',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    FragmentTargetDirective,
    MeterComponent,
    NoticeComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
  ],
  templateUrl: './ai-usage-section.component.html',
  styleUrl: './ai-usage-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiUsageSectionComponent {
  protected readonly store = inject(AiSettingsStore);
  protected readonly actions = inject(AiSettingsActions);
  private readonly locale = inject(LocaleService);

  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly AI_BACKFILL_STATE = AI_BACKFILL_STATE;
  /** The id of the backfill row: the AI intro links to it. */
  protected readonly AI_BACKFILL_FRAGMENT = AI_BACKFILL_FRAGMENT;
  protected readonly pluralKey = pluralKey;

  protected readonly used = computed(() => {
    const usage = this.store.usage();
    return {
      used: this.locale.formatNumber(usage?.linksUsed ?? 0),
      limit: this.locale.formatNumber(usage?.linksLimit ?? 0),
    };
  });

  protected readonly usedPercent = computed(() => {
    const usage = this.store.usage();
    return usage && usage.linksLimit > 0 ? (usage.linksUsed / usage.linksLimit) * 100 : 0;
  });

  protected readonly resetDate = computed(() => {
    const date = aiResetDate(this.store.resetsOn() ?? '');
    return date === null ? '' : this.locale.formatDate(date);
  });

  protected readonly backfill = this.store.backfill;

  protected readonly progress = computed(() => {
    const backfill = this.backfill();
    return {
      done: this.locale.formatNumber(backfill?.done ?? 0),
      total: this.locale.formatNumber(backfill?.total ?? 0),
      percent: backfill && backfill.total > 0 ? (backfill.done / backfill.total) * 100 : 0,
      minutes: this.locale.formatNumber(backfill?.estimatedMinutes ?? 0),
    };
  });
}
