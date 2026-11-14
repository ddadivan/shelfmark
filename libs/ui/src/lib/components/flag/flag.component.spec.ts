import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { compileScss } from '../../../testing/scss';
import { FLAG_BASE_URL } from './flag-base-url.const';
import { FlagComponent } from './flag.component';
import { FLAG_CODE } from './models/flag-code.const';
import type { FlagCode } from './models/flag-code.type';

function render(code: FlagCode) {
  const fixture = TestBed.createComponent(FlagComponent);
  fixture.componentRef.setInput('code', code);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('FlagComponent (#315)', () => {
  it.each(Object.values(FLAG_CODE))('draws the %s flag from its SVG file, decorative', (code) => {
    const host = render(code);
    const img = host.querySelector('img');
    expect(img?.getAttribute('src')).toBe(`assets/ui/flags/${code}.svg`);
    expect(img?.getAttribute('alt')).toBe('');
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });

  it('reads the folder from FLAG_BASE_URL', () => {
    TestBed.configureTestingModule({ providers: [{ provide: FLAG_BASE_URL, useValue: '/cdn/' }] });
    expect(render(FLAG_CODE.Fr).querySelector('img')?.getAttribute('src')).toBe('/cdn/fr.svg');
  });

  it.each(Object.values(FLAG_CODE))(
    'ships %s.svg as a plain SVG without scripts or links',
    (code) => {
      const svg = readFileSync(
        resolve(process.cwd(), 'libs/ui/src/assets/flags', `${code}.svg`),
        'utf8',
      );
      expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[\d .]+">/);
      expect(svg).not.toMatch(/<script|href=|on\w+=/i);
    },
  );

  it('is a 20 x 14 tile with soft corners and a hairline edge above the image', () => {
    const css = compileScss('lib/components/flag/flag.component.scss');
    expect(css).toMatch(/inline-size:\s*1\.25rem/);
    expect(css).toMatch(/block-size:\s*0\.875rem/);
    expect(css).toMatch(/::after\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px var\(--border\)/);
  });

  it('has no axe violations', async () => {
    expect(await axeViolations(render(FLAG_CODE.Gb))).toEqual([]);
  });
});
