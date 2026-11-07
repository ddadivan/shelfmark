import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AvatarComponent, ButtonComponent, SegmentedControlComponent } from '@shelfmark/ui';
import type { SegmentedOption } from '@shelfmark/ui';
import { combineLatest, map } from 'rxjs';
import { EXPORT_FORMAT, type ExportFormat } from '@shelfmark/contracts';
import { ExportActionsService } from '../export/export-actions.service';
import { AuthStore } from '../../core/auth/auth.store';
import { THEME_PREFERENCE } from '../../core/theme/models/theme-preference.const';
import { isThemePreference } from '../../core/theme/is-theme-preference';
import { ThemeService } from '../../core/theme/theme.service';
import { APP_PATH } from '../../models/app-path.const';
import { THEME_OPTION_KEYS } from './models/theme-option-keys.const';
import { SettingsRowComponent } from './settings-row.component';
import { SettingsSectionComponent } from './settings-section.component';

/** `/settings`: the account (read-only, sign out) and the appearance (theme). */
@Component({
  selector: 'app-settings-page',
  imports: [
    TranslocoPipe,
    AvatarComponent,
    ButtonComponent,
    SegmentedControlComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
  ],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SettingsPage {
  protected readonly auth = inject(AuthStore);
  protected readonly theme = inject(ThemeService);
  private readonly exporter = inject(ExportActionsService);
  protected readonly EXPORT_FORMAT = EXPORT_FORMAT;
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly linksHref = `/${APP_PATH.Links}`;

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

  protected async back(event: MouseEvent): Promise<void> {
    event.preventDefault();
    await this.router.navigateByUrl(this.linksHref);
  }

  protected async exportAll(format: ExportFormat): Promise<void> {
    await this.exporter.download(format);
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOutAndLeave();
  }
}
