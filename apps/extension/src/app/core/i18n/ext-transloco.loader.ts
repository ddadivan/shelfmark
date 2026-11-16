import { Service } from '@angular/core';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';
import { EXT_LANG } from './models/ext-lang.const';
import type { ExtLang } from './models/ext-lang.type';

/** Every language is its own lazy chunk; only the one in use is loaded. */
const loaders: Readonly<Record<ExtLang, () => Promise<Translation>>> = {
  [EXT_LANG.En]: async () => (await import('./en.json')).default,
  [EXT_LANG.Fr]: async () => (await import('./fr.json')).default,
  [EXT_LANG.De]: async () => (await import('./de.json')).default,
  [EXT_LANG.It]: async () => (await import('./it.json')).default,
  [EXT_LANG.Es]: async () => (await import('./es.json')).default,
  [EXT_LANG.Pt]: async () => (await import('./pt.json')).default,
  [EXT_LANG.Uk]: async () => (await import('./uk.json')).default,
};

@Service()
export class ExtTranslocoLoader implements TranslocoLoader {
  async getTranslation(lang: string): Promise<Translation> {
    if (!Object.hasOwn(loaders, lang)) {
      throw new Error(`Unsupported language: ${lang}`);
    }
    return loaders[lang as ExtLang]();
  }
}
