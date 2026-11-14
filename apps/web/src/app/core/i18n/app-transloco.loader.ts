import { Service } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { APP_LANG } from './models/app-lang.const';
import type { AppLang } from './models/app-lang.type';

/**
 * Every language, English too, is a lazy chunk (#339: English alone was 63 kB of the initial
 * bundle). `LocaleService.init()` loads the wanted file in an app initializer, before the first
 * render, so text never flashes as keys and a late fill-in cannot shift the layout.
 */
const loaders: Readonly<Record<AppLang, () => Promise<Translation>>> = {
  [APP_LANG.En]: async () => (await import('./en.json')).default,
  [APP_LANG.Fr]: async () => (await import('./fr.json')).default,
  [APP_LANG.De]: async () => (await import('./de.json')).default,
  [APP_LANG.It]: async () => (await import('./it.json')).default,
  [APP_LANG.Es]: async () => (await import('./es.json')).default,
  [APP_LANG.Pt]: async () => (await import('./pt.json')).default,
};

@Service()
export class AppTranslocoLoader implements TranslocoLoader {
  async getTranslation(lang: string): Promise<Translation> {
    // Own keys only: `loaders['constructor']` would otherwise hit Object.prototype.
    if (!Object.hasOwn(loaders, lang)) {
      throw new Error(`Unsupported language: ${lang}`);
    }
    return loaders[lang as AppLang]();
  }
}
