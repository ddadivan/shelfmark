import { resolveJobLanguage } from './resolve-job-language';

describe('resolveJobLanguage', () => {
  it('uses an explicit summary language first', () => {
    expect(resolveJobLanguage('de', 'fr', 'it')).toBe('de');
  });

  it('uses the interface language for app', () => {
    expect(resolveJobLanguage('app', 'uk', 'de')).toBe('uk');
  });

  it('falls back to the best supported Accept-Language while the interface follows the browser', () => {
    expect(resolveJobLanguage('app', 'browser', 'nl-NL, fr-CA;q=0.8, de;q=0.9')).toBe('de');
    expect(resolveJobLanguage('app', 'browser', 'PT-br')).toBe('pt');
    expect(resolveJobLanguage('app', 'browser', 'es;q=0, it;q=0.5, en;q=0.5')).toBe('it');
    expect(resolveJobLanguage('app', 'browser', 'fr;q=abc, es')).toBe('es');
  });

  it('answers English without a usable header', () => {
    expect(resolveJobLanguage('app', 'browser', undefined)).toBe('en');
    expect(resolveJobLanguage('app', 'browser', 'nl, ja;q=0.9')).toBe('en');
    expect(resolveJobLanguage('app', 'xx', '')).toBe('en');
  });
});
