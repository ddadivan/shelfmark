import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AvatarComponent, ButtonComponent, SegmentedControlComponent } from '@shelfmark/ui';
import type { SegmentedOption } from '@shelfmark/ui';
import { combineLatest } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { AUTH_ROUTE } from '../../core/auth/models/auth-routes.const';
import { THEME_PREFERENCE } from '../../core/theme/models/theme-preference.const';
import { ThemeService } from '../../core/theme/theme.service';
import { APP_PATH } from '../../models/app-path.const';
import { SettingsRowComponent } from './settings-row.component';
import { SettingsSectionComponent } from './settings-section.component';

const THEME_KEYS = [
  [THEME_PREFERENCE.System, 'settings.appearance.theme.system'],
  [THEME_PREFERENCE.Light, 'settings.appearance.theme.light'],
  [THEME_PREFERENCE.Dark, 'settings.appearance.theme.dark'],
] as const;

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
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly linksHref = `/${APP_PATH.Links}`;

  private readonly labels = toSignal(
    combineLatest(THEME_KEYS.map(([, key]) => this.transloco.selectTranslate(key))),
    { initialValue: [] as string[] },
  );
  protected readonly themeOptions = computed<SegmentedOption[]>(() => {
    const labels = this.labels();
    return THEME_KEYS.map(([value], index) => ({ value, label: labels[index] ?? '' }));
  });

  protected setTheme(value: string): void {
    const preference = THEME_KEYS.find(([key]) => key === value)?.[0];
    if (preference) {
      this.theme.setPreference(preference);
    }
  }

  protected async back(event: MouseEvent): Promise<void> {
    event.preventDefault();
    await this.router.navigateByUrl(this.linksHref);
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl(AUTH_ROUTE.SignIn);
  }
}
