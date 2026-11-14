import { signal } from '@angular/core';
import { APP_LANG } from './models/app-lang.const';
import type { AppLang } from './models/app-lang.type';

const state = signal<AppLang>(APP_LANG.En);

/**
 * The translation on screen. Written only by `LocaleService` once the language file is loaded;
 * read by `pluralKey` (so a `computed` that builds a plural key re-runs on a switch) and by code
 * that needs the language without injecting the service.
 */
export const activeLang = state.asReadonly();

/** For `LocaleService` (and specs) only. */
export function setActiveLang(lang: AppLang): void {
  state.set(lang);
}
