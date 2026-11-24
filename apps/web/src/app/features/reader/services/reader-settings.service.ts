import { DOCUMENT } from '@angular/common';
import { inject, Service, signal } from '@angular/core';
import { READER_SETTINGS_STORAGE_KEY } from '../models/reader-settings-storage-key.const';
import type { ReaderSettings } from '../models/reader-settings.interface';
import { parseReaderSettings } from '../utils/parse-reader-settings';

/**
 * Reading settings (text size, font, line width, page) of Reader. A device preference in
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
    this.state.set(next);
    try {
      this.doc.defaultView?.localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: the settings last for this page.
    }
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
