import { DOCUMENT } from '@angular/common';
import { inject, Service, signal } from '@angular/core';
import { READER_TEXT_SIZE } from '@shelfmark/ui';
import { READER_SETTINGS_DEFAULT } from '../models/reader-settings-default.const';
import { READER_SETTINGS_STORAGE_KEY } from '../models/reader-settings-storage-key.const';
import type { ReaderSettings } from '../models/reader-settings.interface';
import { parseReaderSettings } from '../utils/parse-reader-settings';

/**
 * Reading settings (theme, font, text size, line spacing, line width) of Reader. A device preference in
 * `localStorage` `sm-reader-settings`, like the preview width; the account has no column for them
 * yet. Storage errors keep the settings for this page.
 */
@Service()
export class ReaderSettingsService {
  private readonly doc = inject(DOCUMENT);
  private readonly state = signal<ReaderSettings>(this.read());
  readonly settings = this.state.asReadonly();

  set(change: Partial<ReaderSettings>): void {
    const next = { ...this.state(), ...change };
    next.size = Math.min(
      READER_TEXT_SIZE.Max,
      Math.max(READER_TEXT_SIZE.Min, Math.round(next.size)),
    );
    this.state.set(next);
    try {
      this.doc.defaultView?.localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: the settings last for this page.
    }
  }

  /** The A buttons: one px smaller (-1) or larger (1), within 14 to 24. */
  stepSize(step: -1 | 1): void {
    this.set({ size: this.state().size + step * READER_TEXT_SIZE.Step });
  }

  /** Reset: back to the defaults (the theme follows the app again). */
  reset(): void {
    this.set({ ...READER_SETTINGS_DEFAULT });
  }

  private read(): ReaderSettings {
    try {
      return parseReaderSettings(
        this.doc.defaultView?.localStorage.getItem(READER_SETTINGS_STORAGE_KEY) ?? null,
      );
    } catch {
      return parseReaderSettings(null);
    }
  }
}
