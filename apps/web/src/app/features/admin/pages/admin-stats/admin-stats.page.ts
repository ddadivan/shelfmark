import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  ADMIN_STATS_BUCKET_KEY,
  INTERFACE_LANGUAGE,
  type AdminStatsPoint,
  type AdminStatsRate,
} from '@shelfmark/contracts';
import {
  BarChartComponent,
  ButtonComponent,
  NOTICE_KIND,
  NoticeComponent,
  PanelComponent,
  SegmentedControlComponent,
  SettingsSectionComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
  type BarChartBar,
  type SegmentedOption,
} from '@shelfmark/ui';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { LANGUAGE_NAMES } from '../../../../core/i18n/models/language-names.const';
import { FEEDBACK_STATUS_VIEW } from '../../../feedback/models/feedback-status-view.const';
import { SettingsPageHeaderComponent } from '../../../settings/components/settings-page-header/settings-page-header.component';
import { AdminShareRowComponent } from '../../components/admin-share-row/admin-share-row.component';
import { AdminSwitchComponent } from '../../components/admin-switch/admin-switch.component';
import { ADMIN_PATH } from '../../models/admin-path.const';
import { ADMIN_STATS_FEATURE_LABEL } from '../../models/admin-stats-feature-label.const';
import type { AdminStatsFormat } from '../../models/admin-stats-format.interface';
import { AdminStatsStore } from '../../services/admin-stats.store';
import { bucketRows, rateRow } from '../../utils/admin-stats-rows';

/** Which sign-up series the chart shows. */
const SIGN_UP_UNIT = { Days: 'days', Weeks: 'weeks' } as const;
/** Every n-th axis text of the day and week charts (fits a 360px phone). */
const LABEL_EVERY = { Days: 5, Weeks: 3 } as const;
const STATUS_KEYS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(FEEDBACK_STATUS_VIEW).map(([status, view]) => [status, view.labelKey]),
);

/**
 * `/admin/stats` (#333): the author's usage numbers, aggregates over real users from
 * `GET /api/admin/stats`. Number tiles, the sign-up chart (days or weeks), feature shares,
 * preferences and ratings; hidden shares and groups read "Not enough users yet" / "Fewer than 3".
 * Loads on entry; Refresh asks again. Only the author gets here (`adminOnly`).
 */
@Component({
  selector: 'app-admin-stats-page',
  imports: [
    TranslocoPipe,
    AdminShareRowComponent,
    AdminSwitchComponent,
    BarChartComponent,
    ButtonComponent,
    NoticeComponent,
    PanelComponent,
    SegmentedControlComponent,
    SettingsPageHeaderComponent,
    SettingsSectionComponent,
    SkeletonComponent,
  ],
  templateUrl: './admin-stats.page.html',
  styleUrl: './admin-stats.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AdminStatsPage {
  protected readonly store = inject(AdminStatsStore);
  private readonly locale = inject(LocaleService);
  private readonly transloco = inject(TranslocoService);
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  protected readonly ADMIN_PATH = ADMIN_PATH;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly SIGN_UP_UNIT = SIGN_UP_UNIT;
  protected readonly unit = signal<string>(SIGN_UP_UNIT.Days);

  /** Translation and number formats in the active language; rebuilt when the language changes. */
  private readonly format = computed<AdminStatsFormat>(() => {
    this.i18n();
    const percent = new Intl.NumberFormat(this.locale.locale(), {
      style: 'percent',
      maximumFractionDigits: 0,
    });
    return {
      t: (key, params) => this.transloco.translate(key, params),
      percent: (share) => percent.format(share),
      number: (value) => this.locale.formatNumber(value),
    };
  });

  protected readonly minGroup = computed(() => this.store.stats()?.minGroup ?? 0);
  protected readonly updated = computed(() => {
    const stats = this.store.stats();
    return stats ? this.locale.formatTime(stats.generatedAt) : '';
  });

  protected readonly unitOptions = computed<SegmentedOption[]>(() => {
    const { t } = this.format();
    return [
      { value: SIGN_UP_UNIT.Days, label: t('admin.stats.signUps.days') },
      { value: SIGN_UP_UNIT.Weeks, label: t('admin.stats.signUps.weeks') },
    ];
  });

  protected readonly tiles = computed(() => {
    const stats = this.store.stats();
    if (!stats) return [];
    const { overview } = stats;
    const format = this.format();
    const rate = (labelKey: string, value: AdminStatsRate) => ({
      labelKey,
      value: value.share === null ? '–' : format.percent(value.share),
      hint:
        value.count === null
          ? format.t('admin.stats.notEnough')
          : format.t('admin.stats.countOf', {
              count: format.number(value.count),
              base: format.number(value.base),
            }),
    });
    return [
      {
        labelKey: 'admin.stats.tiles.realUsers',
        value: format.number(overview.realUsers),
        hint: '',
      },
      rate('admin.stats.tiles.active7d', overview.active7d),
      rate('admin.stats.tiles.returnedWeek', overview.returnedAfterWeek),
      rate('admin.stats.tiles.returnedMonth', overview.returnedAfterMonth),
      rate('admin.stats.tiles.active30d', overview.active30d),
      rate('admin.stats.tiles.onboarded', overview.onboarded),
      {
        labelKey: 'admin.stats.tiles.demo',
        value: format.number(overview.demoSandboxes),
        hint: format.t('admin.stats.tiles.demoHint'),
      },
    ];
  });

  protected readonly activityNote = computed(() => {
    const since = this.store.stats()?.overview.activitySince ?? null;
    const { t } = this.format();
    return since === null
      ? t('admin.stats.activityEstimated')
      : t('admin.stats.activitySince', { date: this.locale.formatDate(`${since}T00:00:00Z`) });
  });

  protected readonly signUps = computed(() => {
    const stats = this.store.stats();
    const { t, number } = this.format();
    const days = this.unit() === SIGN_UP_UNIT.Days;
    const points = (days ? stats?.overview.signUpsByDay : stats?.overview.signUpsByWeek) ?? [];
    const short = this.locale.dateTimeFormat({ day: 'numeric', timeZone: 'UTC' });
    const long = this.locale.dateTimeFormat({ day: 'numeric', month: 'short', timeZone: 'UTC' });
    const at = (point: AdminStatsPoint) => new Date(`${point.start}T00:00:00Z`);
    const bars: BarChartBar[] = points.map((point) => ({
      label: days ? short.format(at(point)) : long.format(at(point)),
      value: point.count,
      description: t(days ? 'admin.stats.signUps.dayBar' : 'admin.stats.signUps.weekBar', {
        date: long.format(at(point)),
        count: number(point.count),
      }),
    }));
    const total = points.reduce((sum, point) => sum + point.count, 0);
    return {
      bars,
      label: t(days ? 'admin.stats.signUps.chartDays' : 'admin.stats.signUps.chartWeeks'),
      summary: t('admin.stats.signUps.total', { count: number(total) }),
      labelHeader: t(days ? 'admin.stats.signUps.day' : 'admin.stats.signUps.week'),
      labelEvery: days ? LABEL_EVERY.Days : LABEL_EVERY.Weeks,
    };
  });

  protected readonly links = computed(() => {
    const stats = this.store.stats();
    const format = this.format();
    const perUser = stats?.features.linksPerUser;
    const fewer = format.t('admin.stats.fewer', { min: this.minGroup() });
    const bars: BarChartBar[] = (perUser?.buckets ?? []).map((bucket) => {
      const label = this.otherOr(bucket.key, () => bucket.key);
      return {
        label,
        value: bucket.count ?? 0,
        description: `${label}: ${bucket.count === null ? fewer : format.number(bucket.count)}`,
      };
    });
    const average =
      perUser?.mean == null || perUser.median == null
        ? format.t('admin.stats.notEnough')
        : format.t('admin.stats.links.average', {
            mean: format.number(perUser.mean),
            median: format.number(perUser.median),
          });
    return { bars, average };
  });

  protected readonly adoption = computed(() => {
    const format = this.format();
    return (this.store.stats()?.features.adoption ?? []).map((row) =>
      rateRow(row.feature, format.t(ADMIN_STATS_FEATURE_LABEL[row.feature]), row.rate, format),
    );
  });

  protected readonly preferences = computed(() => {
    const stats = this.store.stats();
    const format = this.format();
    const k = this.minGroup();
    if (!stats) return [];
    const { t } = format;
    return [
      {
        titleKey: 'admin.stats.preferences.theme',
        rows: bucketRows(
          stats.preferences.theme,
          (key) => this.otherOr(key, () => t(`settings.appearance.theme.${key}`)),
          format,
          k,
        ),
      },
      {
        titleKey: 'admin.stats.preferences.language',
        rows: bucketRows(stats.preferences.language, (key) => this.languageName(key), format, k),
      },
      {
        titleKey: 'admin.stats.preferences.retention',
        rows: bucketRows(
          stats.preferences.trashRetention,
          (key) =>
            this.otherOr(key, () => t('settings.library.trash.retention.days', { count: key })),
          format,
          k,
        ),
      },
    ];
  });

  protected readonly milestones = computed(() => {
    const format = this.format();
    const { t, number } = format;
    return (this.store.stats()?.ratings.milestones ?? []).map((m) => ({
      key: m.milestone,
      title: t(`admin.stats.ratings.milestone.${m.milestone}`),
      answered: t('admin.stats.ratings.answered', {
        answered: number(m.answered),
        skipped: number(m.skipped),
      }),
      summary:
        m.mean === null || m.median === null
          ? t('admin.stats.notEnough')
          : t('admin.stats.ratings.summary', { mean: number(m.mean), median: number(m.median) }),
      groups:
        m.low === null || m.mid === null || m.high === null
          ? ''
          : t('admin.stats.ratings.groups', {
              low: number(m.low),
              mid: number(m.mid),
              high: number(m.high),
            }),
    }));
  });

  protected readonly messages = computed(() => {
    const stats = this.store.stats();
    const { t, number } = this.format();
    const list = (
      buckets: readonly { key: string; count: number | null }[],
      labelOf: (key: string) => string,
    ) =>
      buckets.map((bucket) => ({
        key: bucket.key,
        label: labelOf(bucket.key),
        value: number(bucket.count ?? 0),
      }));
    return [
      {
        titleKey: 'admin.stats.ratings.byKind',
        items: list(stats?.ratings.messagesByKind ?? [], (key) => t(`feedback.kind.${key}`)),
      },
      {
        titleKey: 'admin.stats.ratings.byStatus',
        items: list(stats?.ratings.messagesByStatus ?? [], (key) => t(STATUS_KEYS[key] ?? key)),
      },
    ];
  });

  constructor() {
    void this.store.load();
  }

  protected refresh(): void {
    void this.store.load();
  }

  protected setUnit(value: string): void {
    this.unit.set(value);
  }

  /** "Other" and "Never chosen" for the shared bucket keys, `label()` for everything else. */
  private otherOr(key: string, label: () => string): string {
    const { t } = this.format();
    if (key === ADMIN_STATS_BUCKET_KEY.Other) return t('admin.stats.bucket.other');
    if (key === ADMIN_STATS_BUCKET_KEY.Never) return t('admin.stats.bucket.never');
    return label();
  }

  private languageName(key: string): string {
    if (key === INTERFACE_LANGUAGE.Browser)
      return this.format().t('settings.language.interface.browser');
    const name = (LANGUAGE_NAMES as Readonly<Record<string, string>>)[key];
    return this.otherOr(key, () => name ?? key);
  }
}
