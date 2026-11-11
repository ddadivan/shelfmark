import { INTERFACE_LANGUAGE, WEEK_START } from '@shelfmark/contracts';
import { isAppLang, resolveAppLang, resolveFirstDay, resolveIntlLocale } from './resolve-locale';

describe('resolveAppLang', () => {
  it('uses a chosen language as it is', () => {
    expect(resolveAppLang(INTERFACE_LANGUAGE.De, ['fr-FR'])).toBe('de');
  });

  it('matches the first browser language the app has', () => {
    expect(resolveAppLang(INTERFACE_LANGUAGE.Browser, ['uk-UA', 'pt-BR', 'en'])).toBe('pt');
    expect(resolveAppLang(INTERFACE_LANGUAGE.Browser, ['DE_at'])).toBe('de');
  });

  it('falls back to English', () => {
    expect(resolveAppLang(INTERFACE_LANGUAGE.Browser, ['uk-UA', 'ja'])).toBe('en');
    expect(resolveAppLang(INTERFACE_LANGUAGE.Browser, [])).toBe('en');
  });
});

describe('resolveIntlLocale', () => {
  it('keeps the browser region when it speaks the language', () => {
    expect(resolveIntlLocale('en', ['en-GB', 'en'])).toBe('en-GB');
    expect(resolveIntlLocale('pt', ['fr', 'pt-PT'])).toBe('pt-PT');
  });

  it('uses the bare language otherwise', () => {
    expect(resolveIntlLocale('de', ['en-US'])).toBe('de');
  });

  it('survives a malformed browser tag', () => {
    expect(resolveIntlLocale('en', ['en-@@'])).toBe('en');
  });
});

describe('resolveFirstDay', () => {
  it('honours an explicit choice', () => {
    expect(resolveFirstDay(WEEK_START.Monday, 'en-US')).toBe(1);
    expect(resolveFirstDay(WEEK_START.Sunday, 'de')).toBe(7);
  });

  it('follows the region by default', () => {
    expect(resolveFirstDay(WEEK_START.Default, 'en-US')).toBe(7);
    expect(resolveFirstDay(WEEK_START.Default, 'de-DE')).toBe(1);
    expect(resolveFirstDay(WEEK_START.Default, 'fr')).toBe(1);
  });

  it('falls back to Monday for a locale it cannot read', () => {
    expect(resolveFirstDay(WEEK_START.Default, 'x-@@')).toBe(1);
  });
});

describe('isAppLang', () => {
  it('knows the six languages only', () => {
    expect(isAppLang('it')).toBe(true);
    expect(isAppLang('uk')).toBe(false);
    expect(isAppLang(3)).toBe(false);
  });
});
