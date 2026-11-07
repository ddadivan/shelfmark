import { APP_LANG } from './models/app-lang.const';
import { AppTranslocoLoader } from './app-transloco.loader';

describe('AppTranslocoLoader', () => {
  const loader = new AppTranslocoLoader();

  it('loads the en translations', async () => {
    const translation = await loader.getTranslation(APP_LANG.En);

    expect(translation).toMatchObject({
      landing: { title: 'Shelfmark', tagline: 'Every saved link, in one place.' },
    });
  });

  it('rejects an unsupported language', async () => {
    await expect(loader.getTranslation('de')).rejects.toThrow('Unsupported language: de');
  });

  // Known bug: loaders[lang] reads inherited keys (Object.prototype); remove .fails once the loader uses an own-property check.
  it('does not resolve prototype keys as languages', async () => {
    await expect(loader.getTranslation('constructor')).rejects.toThrow('Unsupported language');
  });
});
