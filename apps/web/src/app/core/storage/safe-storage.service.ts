import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';

/**
 * The one door to `localStorage`. Storage may be missing (no window), blocked (private mode,
 * privacy settings), full, or hold garbage: every access is guarded, reads give the fallback, and
 * writes report whether they landed (callers keep the value in memory and may ignore it).
 */
@Service()
export class SafeStorage {
  private readonly document = inject(DOCUMENT);

  /** The raw string, or `null` when absent or unreadable. */
  getString(key: string): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  /** The parsed value when it passes `guard`; `fallback` when absent, unparsable or rejected. */
  getJson<T, F = T>(key: string, guard: (value: unknown) => value is T, fallback: F): T | F {
    const raw = this.getString(key);
    if (raw === null) {
      return fallback;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      return guard(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  /** The parsed value, unchecked; `undefined` when absent or not valid JSON. Narrow it yourself. */
  getJsonValue(key: string): unknown {
    const raw = this.getString(key);
    if (raw === null) {
      return undefined;
    }
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return undefined;
    }
  }

  /** The stored number; `fallback` when absent or not a finite number. */
  getNumber(key: string, fallback: number | null = null): number | null {
    const raw = this.getString(key);
    if (raw === null || raw.trim() === '') {
      return fallback;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  /** Whether the value was stored. */
  set(key: string, value: string): boolean {
    try {
      const storage = this.document.defaultView?.localStorage;
      if (!storage) {
        return false;
      }
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  /** Whether the value was stored. */
  setJson(key: string, value: unknown): boolean {
    try {
      return this.set(key, JSON.stringify(value));
    } catch {
      return false;
    }
  }

  remove(key: string): void {
    try {
      this.document.defaultView?.localStorage.removeItem(key);
    } catch {
      // Blocked storage holds nothing to remove.
    }
  }
}
