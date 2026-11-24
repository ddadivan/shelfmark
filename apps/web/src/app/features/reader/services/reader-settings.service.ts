import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injector, Service, signal } from '@angular/core';
import type { UserSettingsResponse } from '@shelfmark/contracts';
import { READER_TEXT_SIZE } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { USER_SETTINGS_API } from '../../settings/models/user-settings-api.const';
import { READER_SETTINGS_DEFAULT } from '../models/reader-settings-default.const';
import { READER_SETTINGS_STORAGE_KEY } from '../models/reader-settings-storage-key.const';
import type { ReaderSettings } from '../models/reader-settings.interface';
import { parseReaderSettings } from '../utils/parse-reader-settings';
import { readerPreferencesOf, readerSettingsOf } from '../utils/reader-preferences-mapping';

/** Slider steps and quick taps are saved together once the person pauses. */
const SAVE_DELAY_MS = 600;

/**
 * Reading settings (theme, font, text size, line spacing, line width) of Reader, kept on the
 * account (`/api/me/settings`, `reader*` fields) like the appearance: `localStorage`
 * `sm-reader-settings` paints them first, the account wins once it has saved them
 * (`UserSettingsStore` calls `adopt`), and settings this browser had before the account kept any are
 * saved once. A change applies at once, is stored locally and saved after a short pause; a failed
 * save keeps the change here and is sent again with the next one. Storage errors keep the settings
 * for this page.
 */
@Service()
export class ReaderSettingsService {
  private readonly doc = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly state = signal<ReaderSettings>(this.read());
  readonly settings = this.state.asReadonly();

  /** Fields changed here and not saved on the account yet. */
  private pending: Partial<ReaderSettings> = {};
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Bumped by every local change: an account answer read before it must not undo it. */
  private edits = 0;

  constructor() {
    const scope = inject(SessionScope);
    // A change still waiting is sent while the session is valid; then nothing is left to send.
    scope.beforeEnd(() => this.flushNow());
    scope.onEnd(() => {
      this.cancelTimer();
      this.pending = {};
    });
    // A pause timer must not outlive the injector it reads the API from.
    inject(DestroyRef).onDestroy(() => this.cancelTimer());
  }

  set(change: Partial<ReaderSettings>): void {
    const next = { ...this.state(), ...change };
    next.size = Math.min(
      READER_TEXT_SIZE.Max,
      Math.max(READER_TEXT_SIZE.Min, Math.round(next.size)),
    );
    const sent: Partial<ReaderSettings> = { ...change };
    if (change.size !== undefined) sent.size = next.size;
    this.edits++;
    this.apply(next);
    this.pending = { ...this.pending, ...sent };
    this.schedule();
  }

  /** The A buttons: one px smaller (-1) or larger (1), within 14 to 24. */
  stepSize(step: -1 | 1): void {
    this.set({ size: this.state().size + step * READER_TEXT_SIZE.Step });
  }

  /** Reset: back to the defaults (the theme follows the app again). */
  reset(): void {
    this.set({ ...READER_SETTINGS_DEFAULT });
  }

  /** A token for `adopt`: the local edits made so far. */
  editToken(): number {
    return this.edits;
  }

  /**
   * The account's settings arrived (`token` from `editToken` when the request started). Saved on the
   * account: they win, unless the person changed something here meanwhile. Never saved there but
   * stored in this browser: saved once, silently.
   */
  adopt(settings: UserSettingsResponse, token: number): void {
    if (token !== this.edits) {
      return;
    }
    if (settings.readerSaved) {
      this.apply(readerSettingsOf(settings));
    } else if (this.hasStored()) {
      this.pending = { ...this.state() };
      void this.flush();
    }
  }

  private apply(next: ReaderSettings): void {
    this.state.set(next);
    try {
      this.doc.defaultView?.localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: the settings last for this page.
    }
  }

  private cancelTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private flushNow(): Promise<void> {
    this.cancelTimer();
    return this.flush();
  }

  private schedule(): void {
    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, SAVE_DELAY_MS);
  }

  private async flush(): Promise<void> {
    const api = this.injector.get(USER_SETTINGS_API, null);
    const change = this.pending;
    if (api === null || Object.keys(change).length === 0) {
      return;
    }
    this.pending = {};
    try {
      await firstValueFrom(api.update(readerPreferencesOf(change)));
    } catch {
      // Kept here; sent again with the next change (newer fields win).
      this.pending = { ...change, ...this.pending };
    }
  }

  private hasStored(): boolean {
    try {
      return this.doc.defaultView?.localStorage.getItem(READER_SETTINGS_STORAGE_KEY) != null;
    } catch {
      return false;
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
