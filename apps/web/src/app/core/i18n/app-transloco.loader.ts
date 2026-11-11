import { Service } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import en from './en.json';
import { APP_LANG } from './models/app-lang.const';
import type { AppLang } from './models/app-lang.type';

/**
 * English is part of the main bundle, so an English first render needs no extra request (a lazy
 * chunk delayed FCP/LCP and a late fill-in shifted the layout). The other languages are lazy
 * chunks, loaded before they are switched on (`LocaleService`), so text never flashes as keys.
 */
const loaders: Readonly<Record<AppLang, () => Promise<Translation>>> = {
  [APP_LANG.En]: () => Promise.resolve(en),
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
