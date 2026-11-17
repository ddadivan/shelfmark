import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  input,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AI_APPLIED_PART, AI_FEATURE_MODE, type AiAppliedPart } from '@shelfmark/contracts';
import { RadioGroupComponent, SettingsSectionComponent, type RadioOption } from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { APP_PATH } from '../../../../models/app-path.const';
import { AiSettingsActions } from '../../../ai/services/ai-settings-actions.service';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { isAiFeatureMode } from '../../../ai/utils/ai-setting-values';
import { SettingsPageHeaderComponent } from '../../components/settings-page-header/settings-page-header.component';
import { SETTINGS_PATH } from '../../models/settings-path.const';

/**
 * `/settings/ai/folder` and `/settings/ai/tags` (MobileAi state 7): the phone's full-label choice
 * of one part's mode, Suggest / "Apply automatically when I don't choose" / Off, each with its
 * explanation, and the promise under it. Saves at once like the desktop control; back leads to
 * Settings › AI. `part` comes from the route data.
 */
@Component({
  selector: 'app-settings-ai-mode-page',
  imports: [
    TranslocoPipe,
    RadioGroupComponent,
    SettingsPageHeaderComponent,
    SettingsSectionComponent,
  ],
  templateUrl: './ai-mode.page.html',
  styleUrl: './ai-mode.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AiModePage {
  protected readonly store = inject(AiSettingsStore);
  private readonly actions = inject(AiSettingsActions);
  private readonly transloco = inject(TranslocoService);
  private readonly injector = inject(Injector);

  /** Which mode this page sets. */
  readonly part = input<AiAppliedPart>(AI_APPLIED_PART.Folder);

  protected readonly backHref = `/${APP_PATH.Settings}/${SETTINGS_PATH.Ai}`;
  protected readonly key = computed(() => `ai.settings.modePage.${this.part()}`);
  protected readonly titleKey = computed(() => `ai.settings.${this.part()}.label`);

  protected readonly value = computed(() => {
    const settings = this.store.settings();
    return this.part() === AI_APPLIED_PART.Folder ? settings.folderMode : settings.tagsMode;
  });

  protected readonly options = computed<RadioOption[]>(() => {
    // Re-runs on a language switch (`translate` itself is not reactive).
    activeLang();
    const key = this.key();
    const t = (suffix: string) => this.transloco.translate(`${key}.${suffix}`);
    return [
      {
        value: AI_FEATURE_MODE.Suggest,
        title: this.transloco.translate('ai.settings.mode.suggest'),
        description: t('suggestHint'),
      },
      {
        value: AI_FEATURE_MODE.Auto,
        title: this.transloco.translate('ai.settings.modePage.auto'),
        description: t('autoHint'),
      },
      {
        value: AI_FEATURE_MODE.Off,
        title: this.transloco.translate('ai.settings.mode.off'),
        description: t('offHint'),
      },
    ];
  });

  constructor() {
    void this.store.load();
  }

  /** A mode from the list; a failed save puts the list back to what is saved. */
  protected async set(value: string, control: RadioGroupComponent): Promise<void> {
    if (!isAiFeatureMode(value) || value === this.value()) {
      return;
    }
    const change =
      this.part() === AI_APPLIED_PART.Folder ? { folderMode: value } : { tagsMode: value };
    if (!(await this.actions.save(change))) {
      afterNextRender(() => control.value.set(this.value()), { injector: this.injector });
    }
  }
}
