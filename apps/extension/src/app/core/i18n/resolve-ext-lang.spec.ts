import { resolveExtLang } from './resolve-ext-lang';

describe('resolveExtLang', () => {
  it('uses the first supported browser language', () => {
    expect(resolveExtLang(['ja', 'de-DE', 'fr'])).toBe('de');
  });

  it('reads the base of a region tag, with either separator and any case', () => {
    expect(resolveExtLang(['PT_br'])).toBe('pt');
    expect(resolveExtLang(['uk-UA'])).toBe('uk');
  });

  it('falls back to English when none is supported', () => {
    expect(resolveExtLang(['ja', 'zh-CN'])).toBe('en');
  });

  it('falls back to English for an empty list or an empty tag', () => {
    expect(resolveExtLang([])).toBe('en');
    expect(resolveExtLang([''])).toBe('en');
  });
});
