import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import {
  CUSTOM_THEME_DEFAULT,
  LANGUAGE_SETTINGS_DEFAULT,
  LAYOUT_SETTINGS_DEFAULT,
  type LanguageSettings,
  type LayoutSettings,
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  isAppFont,
  isCardPreview,
  isCustomTheme,
  isDensity,
  isTextSize,
  isMotionPreference,
  isThemePreference,
  type UpdateUserSettingsRequest,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { defer, delay, type Observable, of } from 'rxjs';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import { MOCK_APPEARANCE_STORAGE_KEY } from '../models/mock-appearance-storage-key.const';
import type { MockAppearance } from '../models/mock-appearance.type';
import type { UserSettingsApi } from '../models/user-settings-api.interface';
import { readMockLanguageSettings, writeMockLanguageSettings } from './read-mock-language-settings';

/**
 * `UserSettingsApi` over the shared in-memory library, with simulated latency: the retention
 * lives next to the mock Trash, so a change shows in the days left of the mock entries. The
 * appearance (theme, custom theme, motion, whether it was ever saved) and the Settings › Library
 * choices stand in for the account: they are kept in `localStorage`, so a reload and another tab
 * see them like they would see the server's.
 */
@Service()
export class MockUserSettingsApi implements UserSettingsApi {
  private readonly data = inject(MockLibraryData);
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage;

  get(): Observable<UserSettingsResponse> {
    return defer(() => of(this.current())).pipe(delay(MOCK_LATENCY_MS.List));
  }

  update(request: UpdateUserSettingsRequest): Observable<UserSettingsResponse> {
    return defer(() => {
      if (request.trashRetentionDays !== undefined) {
        this.data.trashRetentionDays = request.trashRetentionDays;
      }
      if (request.folderColours !== undefined) {
        this.data.folderColours = request.folderColours;
      }
      if (request.pauseHistory !== undefined) {
        this.data.pauseHistory = request.pauseHistory;
      }
      const library = { ...this.data.library };
      for (const key of Object.keys(library) as (keyof typeof library)[]) {
        if (request[key] !== undefined) {
          Object.assign(library, { [key]: request[key] });
        }
      }
      this.data.library = library;
      const layoutKeys = Object.keys(LAYOUT_SETTINGS_DEFAULT) as (keyof LayoutSettings)[];
      const layoutSent = layoutKeys.some((key) => request[key] !== undefined);
      if (request.theme ?? request.customTheme ?? request.motion ?? layoutSent) {
        const appearance = this.readAppearance();
        const layout: LayoutSettings = { ...appearance };
        for (const key of layoutKeys) {
          if (request[key] !== undefined) {
            Object.assign(layout, { [key]: request[key] });
          }
        }
        this.writeAppearance({
          ...layout,
          theme: request.theme ?? appearance.theme,
          customTheme: request.customTheme ?? appearance.customTheme,
          motion: request.motion ?? appearance.motion,
          appearanceSaved: true,
        });
      }
      const languageKeys = Object.keys(LANGUAGE_SETTINGS_DEFAULT) as (keyof LanguageSettings)[];
      if (languageKeys.some((key) => request[key] !== undefined)) {
        const language = readMockLanguageSettings(this.storage).settings;
        for (const key of languageKeys) {
          if (request[key] !== undefined) {
            Object.assign(language, { [key]: request[key] });
          }
        }
        writeMockLanguageSettings(this.storage, language);
      }
      return of(this.current());
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  private current(): UserSettingsResponse {
    return {
      trashRetentionDays: this.data.trashRetentionDays,
      folderColours: this.data.folderColours,
      pauseHistory: this.data.pauseHistory,
      ...this.readAppearance(),
      ...this.data.library,
      ...this.readLanguage(),
    };
  }

  private readLanguage(): LanguageSettings & Pick<UserSettingsResponse, 'languageSaved'> {
    const { settings, saved } = readMockLanguageSettings(this.storage);
    return { ...settings, languageSaved: saved };
  }

  private readAppearance(): MockAppearance {
    let stored: Partial<Record<keyof MockAppearance, unknown>> = {};
    try {
      const parsed: unknown = JSON.parse(
        this.storage?.getItem(MOCK_APPEARANCE_STORAGE_KEY) ?? '{}',
      );
      if (typeof parsed === 'object' && parsed !== null) {
        stored = parsed;
      }
    } catch {
      // Missing, blocked or broken storage: the defaults below.
    }
    return {
      theme: isThemePreference(stored.theme) ? stored.theme : THEME_PREFERENCE.System,
      customTheme: isCustomTheme(stored.customTheme)
        ? stored.customTheme
        : { ...CUSTOM_THEME_DEFAULT },
      motion: isMotionPreference(stored.motion) ? stored.motion : MOTION_PREFERENCE.System,
      ...this.readLayout(stored),
      // Stored only by a write of the appearance, like the account's `appearance_saved_at`.
      appearanceSaved: isThemePreference(stored.theme),
    };
  }

  /** The layout fields of the stored mock appearance; a missing or broken one is the default. */
  private readLayout(stored: Partial<Record<keyof MockAppearance, unknown>>): LayoutSettings {
    const d = LAYOUT_SETTINGS_DEFAULT;
    const flag = (value: unknown, fallback: boolean): boolean =>
      typeof value === 'boolean' ? value : fallback;
    return {
      textSize: isTextSize(stored.textSize) ? stored.textSize : d.textSize,
      font: isAppFont(stored.font) ? stored.font : d.font,
      density: isDensity(stored.density) ? stored.density : d.density,
      cardPreview: isCardPreview(stored.cardPreview) ? stored.cardPreview : d.cardPreview,
      cardSite: flag(stored.cardSite, d.cardSite),
      cardNotes: flag(stored.cardNotes, d.cardNotes),
      cardTags: flag(stored.cardTags, d.cardTags),
    };
  }

  private writeAppearance(appearance: MockAppearance): void {
    try {
      this.storage?.setItem(MOCK_APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
    } catch {
      // Storage unavailable: the change lasts until the next read.
    }
  }
}
