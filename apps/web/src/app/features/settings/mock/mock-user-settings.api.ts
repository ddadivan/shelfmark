import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import {
  CUSTOM_THEME_DEFAULT,
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  isCustomTheme,
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

/**
 * `UserSettingsApi` over the shared in-memory library, with simulated latency: the retention
 * lives next to the mock Trash, so a change shows in the days left of the mock entries. The
 * appearance (theme, custom theme, motion) stands in for the account: it is kept in
 * `localStorage`, so a reload and another tab see it like they would see the server's.
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
      const appearance = this.readAppearance();
      this.writeAppearance({
        theme: request.theme ?? appearance.theme,
        customTheme: request.customTheme ?? appearance.customTheme,
        motion: request.motion ?? appearance.motion,
      });
      return of(this.current());
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  private current(): UserSettingsResponse {
    return {
      trashRetentionDays: this.data.trashRetentionDays,
      folderColours: this.data.folderColours,
      pauseHistory: this.data.pauseHistory,
      ...this.readAppearance(),
    };
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
