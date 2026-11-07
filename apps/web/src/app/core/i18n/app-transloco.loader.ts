import { Service } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import en from './en.json';
import { APP_LANG } from './models/app-lang.const';

const translations: Readonly<Record<string, Translation>> = {
  [APP_LANG.En]: en,
};

/**
 * Static loader: the default language is part of the main bundle, so the first render needs
 * no extra request (a lazy chunk delayed FCP/LCP and a late fill-in shifted the layout).
 */
@Service()
export class AppTranslocoLoader implements TranslocoLoader {
  async getTranslation(lang: string): Promise<Translation> {
    // Own keys only: `translations['constructor']` would otherwise hit Object.prototype.
    if (!Object.hasOwn(translations, lang)) {
      throw new Error(`Unsupported language: ${lang}`);
    }
    return translations[lang];
  }
}
