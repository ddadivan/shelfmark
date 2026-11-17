import { ExtTranslocoLoader } from './ext-transloco.loader';
import en from './en.json';
import { EXT_LANG } from './models/ext-lang.const';

describe('ExtTranslocoLoader', () => {
  const loader = new ExtTranslocoLoader();

  it('loads the file of every supported language', async () => {
    for (const lang of Object.values(EXT_LANG)) {
      expect(Object.keys(await loader.getTranslation(lang))).toEqual(['popup']);
    }
  });

  it('loads the English source for en', async () => {
    expect(await loader.getTranslation('en')).toEqual(en);
  });

  it('rejects an unsupported language', async () => {
    await expect(loader.getTranslation('xx')).rejects.toThrow('Unsupported language: xx');
  });

  it('rejects a name from the object prototype', async () => {
    await expect(loader.getTranslation('constructor')).rejects.toThrow('Unsupported language');
  });
});
