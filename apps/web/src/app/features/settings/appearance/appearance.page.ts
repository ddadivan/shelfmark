import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  SegmentedControlComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
} from '@shelfmark/ui';
import type { SegmentedOption } from '@shelfmark/ui';
import { combineLatest, map } from 'rxjs';
import { THEME_PREFERENCE } from '../../../core/theme/models/theme-preference.const';
import { isThemePreference } from '../../../core/theme/is-theme-preference';
import { ThemeService } from '../../../core/theme/theme.service';
import { THEME_OPTION_KEYS } from '../models/theme-option-keys.const';
import { SettingsPageHeaderComponent } from '../settings-page-header/settings-page-header.component';

/** `/settings/appearance`: the theme (applies at once) and the language (English only for now). */
@Component({
  selector: 'app-settings-appearance-page',
  imports: [
    TranslocoPipe,
    SegmentedControlComponent,
    SettingsPageHeaderComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
  ],
  templateUrl: './appearance.page.html',
  styleUrl: './appearance.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AppearancePage {
  protected readonly theme = inject(ThemeService);
  private readonly transloco = inject(TranslocoService);

  /** Labels by preference; `undefined` until the translations are loaded. */
  private readonly labels = toSignal(
    combineLatest(
      Object.entries(THEME_OPTION_KEYS).map(([preference, key]) =>
        this.transloco.selectTranslate(key).pipe(map((label) => [preference, label] as const)),
      ),
    ).pipe(map((pairs) => new Map(pairs))),
  );
  protected readonly themeOptions = computed<SegmentedOption[] | null>(() => {
    const labels = this.labels();
    return labels
      ? Object.values(THEME_PREFERENCE).map((value) => ({ value, label: labels.get(value) ?? '' }))
      : null;
  });

  protected setTheme(value: string): void {
    if (isThemePreference(value)) {
      this.theme.setPreference(value);
    }
  }
}
