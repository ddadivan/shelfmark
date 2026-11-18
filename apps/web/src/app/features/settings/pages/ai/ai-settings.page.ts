import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  AI_APPLIED_PART,
  AI_FEATURE_MODE,
  AI_SUMMARY_LANGUAGE_APP,
  type AiAppliedPart,
  type AiFeatureMode,
  type AiSettings,
  type UpdateAiSettingsRequest,
} from '@shelfmark/contracts';
import {
  AiLineComponent,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  NOTICE_KIND,
  NoticeComponent,
  SegmentedControlComponent,
  SelectComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
  SwitchComponent,
  type SegmentedOption,
  type SelectOption,
} from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { LANGUAGE_NAMES } from '../../../../core/i18n/models/language-names.const';
import { FragmentTargetDirective } from '../../../../core/layout/fragment-target.directive';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { APP_PATH } from '../../../../models/app-path.const';
import { AiUsageSectionComponent } from '../../../ai/components/ai-usage-section/ai-usage-section.component';
import { ConnectAssistantComponent } from '../../../ai/connect/components/connect-assistant/connect-assistant.component';
import { MeaningSearchControlComponent } from '../../../ai/components/meaning-search-control/meaning-search-control.component';
import { AskControlComponent } from '../../../ai/components/ask-control/ask-control.component';
import { AI_MODE_LABEL_KEYS } from '../../../ai/models/ai-mode-label-keys.const';
import { AiSettingsActions } from '../../../ai/services/ai-settings-actions.service';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { AiTickService } from '../../../ai/services/ai-tick.service';
import { isAiFeatureMode, isAiSummaryLanguage } from '../../../ai/utils/ai-setting-values';
import { PRIVACY_AI_FRAGMENT } from '../../../privacy/models/privacy-ai-fragment.const';
import { SettingsPageHeaderComponent } from '../../components/settings-page-header/settings-page-header.component';
import { AI_DATA_FRAGMENT } from '../../models/ai-data-fragment.const';
import { SETTINGS_PATH } from '../../models/settings-path.const';

/**
 * `/settings/ai` (AiSettings mockup, #389): the main switch (the first time through the AI intro);
 * while on, folder and tags mode (Suggest / Automatic / Off; on a phone a row per part opens the
 * full-label choices of MobileAi state 7), Summaries, Search by meaning (AI-3: the switch and how
 * many links are ready), "What is sent" (notes, summary language),
 * "This month" (usage, "Process existing links"). "Your AI data" (delete, the privacy policy) is
 * always there, and "Connect your assistant" (the MCP server, #395) comes last, with AI on or off.
 * Every choice saves at once and rolls back with a toast. The provider-status line
 * shows only while AI is on and the provider fails.
 */
@Component({
  selector: 'app-settings-ai-page',
  imports: [
    TranslocoPipe,
    AiLineComponent,
    AiUsageSectionComponent,
    ButtonComponent,
    ConnectAssistantComponent,
    FragmentTargetDirective,
    MeaningSearchControlComponent,
    AskControlComponent,
    NoticeComponent,
    SegmentedControlComponent,
    SelectComponent,
    SettingsPageHeaderComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
    SwitchComponent,
  ],
  templateUrl: './ai-settings.page.html',
  styleUrl: './ai-settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AiSettingsPage {
  protected readonly store = inject(AiSettingsStore);
  protected readonly actions = inject(AiSettingsActions);
  protected readonly viewport = inject(ViewportService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly AI_MODE_LABEL_KEYS = AI_MODE_LABEL_KEYS;
  protected readonly AI_DATA_FRAGMENT = AI_DATA_FRAGMENT;
  protected readonly privacyHref = `/${APP_PATH.Privacy}#${PRIVACY_AI_FRAGMENT}`;

  /** The folder and tags rows: their keys, current mode and phone page. */
  protected readonly parts = computed(() => {
    const settings = this.store.settings();
    return [
      { part: AI_APPLIED_PART.Folder, key: 'ai.settings.folder', mode: settings.folderMode },
      { part: AI_APPLIED_PART.Tags, key: 'ai.settings.tags', mode: settings.tagsMode },
    ].map((row) => ({
      ...row,
      href: `/${APP_PATH.Settings}/${SETTINGS_PATH.Ai}/${row.part}`,
    }));
  });

  protected readonly modeOptions = computed<SegmentedOption[]>(() => {
    // Re-runs on a language switch (`translate` itself is not reactive).
    activeLang();
    return Object.values(AI_FEATURE_MODE).map((mode) => ({
      value: mode,
      label: this.transloco.translate(AI_MODE_LABEL_KEYS[mode]),
    }));
  });

  protected readonly languageOptions = computed<SelectOption[]>(() => {
    const lang = activeLang();
    return [
      {
        id: AI_SUMMARY_LANGUAGE_APP,
        name: this.transloco.translate('ai.settings.language.app', {
          language: LANGUAGE_NAMES[lang],
        }),
      },
      ...Object.entries(LANGUAGE_NAMES).map(([id, name]) => ({ id, name, lang: id })),
    ];
  });

  constructor() {
    void this.store.load();
    // Keeps "Process existing links" moving while this page (or anything else) waits on AI.
    inject(AiTickService);
  }

  /** The main switch; it shows what is saved once the intro or the request is done. */
  protected async setEnabled(on: boolean, control: SwitchComponent): Promise<void> {
    control.checked.set(await this.actions.setEnabled(on));
  }

  /** A mode from the control; a failed save puts the control back to what is saved. */
  protected async setMode(
    part: AiAppliedPart,
    value: string,
    control: SegmentedControlComponent,
  ): Promise<void> {
    const saved = () => modeOf(part, this.store.settings());
    if (!isAiFeatureMode(value) || value === saved()) {
      return;
    }
    if (!(await this.actions.save(modeChange(part, value)))) {
      this.putBack(() => control.value.set(saved()));
    }
  }

  /** Summaries or notes; a failed save puts the switch back. */
  protected async setSwitch(
    field: 'summaries' | 'includeNotes',
    on: boolean,
    control: SwitchComponent,
  ): Promise<void> {
    if (on === this.store.settings()[field]) {
      return;
    }
    if (!(await this.actions.save({ [field]: on }))) {
      this.putBack(() => control.checked.set(this.store.settings()[field]));
    }
  }

  protected setLanguage(value: string | null): void {
    if (isAiSummaryLanguage(value) && value !== this.store.settings().summaryLanguage) {
      void this.actions.save({ summaryLanguage: value });
    }
  }

  /**
   * Puts a control back after the next render: set right away, the control would still hold the
   * value it last drew and nothing would be redrawn (the clicked radio would stay checked).
   */
  private putBack(apply: () => void): void {
    afterNextRender(apply, { injector: this.injector });
  }

  protected async open(event: MouseEvent, href: string): Promise<void> {
    event.preventDefault();
    await this.router.navigateByUrl(href);
  }
}

function modeChange(part: AiAppliedPart, mode: AiFeatureMode): UpdateAiSettingsRequest {
  return part === AI_APPLIED_PART.Folder ? { folderMode: mode } : { tagsMode: mode };
}

function modeOf(part: AiAppliedPart, settings: AiSettings): AiFeatureMode {
  return part === AI_APPLIED_PART.Folder ? settings.folderMode : settings.tagsMode;
}
