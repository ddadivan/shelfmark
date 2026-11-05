import { Service } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';

const loaders: Readonly<Record<string, () => Promise<{ default: Translation }>>> = {
  en: () => import('./en.json'),
};

/** Static loader: translations are bundled lazily, no HTTP request. */
@Service()
export class AppTranslocoLoader implements TranslocoLoader {
  async getTranslation(lang: string): Promise<Translation> {
    // Own keys only: `loaders['constructor']` would otherwise hit Object.prototype.
    if (!Object.hasOwn(loaders, lang)) {
      throw new Error(`Unsupported language: ${lang}`);
    }
    return (await loaders[lang]()).default;
  }
}
