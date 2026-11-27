import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { Translate } from './translate.service';

describe('Translate', () => {
  const translate = vi.fn((key: string, params?: unknown) => `${key}|${JSON.stringify(params)}`);

  function setup(): Translate {
    TestBed.configureTestingModule({
      providers: [{ provide: TranslocoService, useValue: { translate } }],
    });
    return TestBed.inject(Translate);
  }

  it('t() passes key and params to Transloco', () => {
    expect(setup().t('a.b', { name: 'x' })).toBe('a.b|{"name":"x"}');
  });

  it('plural() picks the plural key and passes count as a string', () => {
    const service = setup();
    expect(service.plural('links.count', 1)).toMatch(/^links\.count\.one\|\{"count":"1"\}$/);
    expect(service.plural('links.count', 3, { folder: 'W' })).toMatch(
      /^links\.count\.other\|\{"count":"3","folder":"W"\}$/,
    );
  });

  it('plural() lets params override the count (formatted number)', () => {
    expect(setup().plural('links.count', 1500, { count: '1,500' })).toContain('"count":"1,500"');
  });
});
