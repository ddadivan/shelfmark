import { APP_LANG } from './models/app-lang.const';
import { AppTranslocoLoader } from './app-transloco.loader';

describe('AppTranslocoLoader', () => {
  const loader = new AppTranslocoLoader();

  it('loads the en translations', async () => {
    const translation = await loader.getTranslation(APP_LANG.En);

    expect(translation).toMatchObject({
      landing: {
        hero: { line1: 'Paste a link.' },
        finale: { title: 'Empty your Saved Messages.' },
      },
    });
    for (const scope of ['landing', 'auth', 'shell', 'library', 'privacy']) {
      expect(translation).toHaveProperty(scope);
    }
  });

  it.each([
    [APP_LANG.Fr, 'Collez un lien.'],
    [APP_LANG.De, 'Link einfügen.'],
    [APP_LANG.It, 'Incolla un link.'],
    [APP_LANG.Es, 'Pega un enlace.'],
    [APP_LANG.Pt, 'Cole um link.'],
  ])('loads the %s translations lazily', async (lang, line1) => {
    const translation = await loader.getTranslation(lang);

    expect(translation).toMatchObject({ landing: { hero: { line1 } } });
  });

  it('rejects an unsupported language', async () => {
    await expect(loader.getTranslation('uk')).rejects.toThrow('Unsupported language: uk');
  });

  it('does not resolve prototype keys as languages', async () => {
    await expect(loader.getTranslation('constructor')).rejects.toThrow('Unsupported language');
  });
});
