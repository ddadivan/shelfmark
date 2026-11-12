import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { LogoComponent } from './logo.component';
import type { LogoTone } from './models/logo-tone.type';
import type { LogoVariant } from './models/logo-variant.type';
import { LOGO_VARIANT } from './models/logo-variant.const';
import { LOGO_TONE } from './models/logo-tone.const';

interface Inputs {
  variant?: LogoVariant;
  tone?: LogoTone;
  label?: string;
  wordmark?: string;
}

function render(inputs: Inputs = {}) {
  const fixture = TestBed.createComponent(LogoComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('LogoComponent', () => {
  it('is a lockup in colour by default', () => {
    const { host } = render();
    expect(host.classList.contains('ui-logo--lockup')).toBe(true);
    expect(host.classList.contains('ui-logo--mono')).toBe(false);
    expect(host.querySelector('.ui-logo__wordmark')?.textContent).toBe('Shelfmark');
    expect(host.querySelector('.ui-logo__card')).not.toBeNull();
    expect(host.querySelector('.ui-logo__bookmark')).not.toBeNull();
  });

  it('draws the mark of the logo asset', () => {
    const { host } = render({ variant: LOGO_VARIANT.Mark });
    expect(host.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 32 32');
    expect(host.querySelector('.ui-logo__card')?.getAttribute('rx')).toBe('6');
    expect(host.querySelector('.ui-logo__bookmark')?.getAttribute('d')).toBe(
      'M19 5h6v11l-3-2.4-3 2.4z',
    );
  });

  it('omits the wordmark for the mark variant', () => {
    const { host } = render({ variant: LOGO_VARIANT.Mark });
    expect(host.classList.contains('ui-logo--mark')).toBe(true);
    expect(host.querySelector('.ui-logo__wordmark')).toBeNull();
  });

  it('renders the mono mark as one cut-out path in currentColor', () => {
    const { host } = render({ tone: LOGO_TONE.Mono });
    expect(host.classList.contains('ui-logo--mono')).toBe(true);
    expect(host.querySelector('.ui-logo__mono')?.getAttribute('fill-rule')).toBe('evenodd');
    expect(host.querySelector('.ui-logo__card')).toBeNull();
  });

  it('takes the wordmark text from the input', () => {
    const { host } = render({ wordmark: 'Bookshelf' });
    expect(host.querySelector('.ui-logo__wordmark')?.textContent).toBe('Bookshelf');
  });

  it('hides a bare mark from assistive technology', () => {
    const { host } = render({ variant: LOGO_VARIANT.Mark });
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.hasAttribute('role')).toBe(false);
  });

  it('keeps the lockup readable through its wordmark', () => {
    const { host } = render();
    expect(host.hasAttribute('aria-hidden')).toBe(false);
  });

  it('is a named image with a label', () => {
    const { host } = render({ variant: LOGO_VARIANT.Mark, label: 'Shelfmark' });
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('Shelfmark');
    expect(host.hasAttribute('aria-hidden')).toBe(false);
  });

  it.each<Inputs>([
    {},
    { variant: LOGO_VARIANT.Mark },
    { variant: LOGO_VARIANT.Mark, label: 'Shelfmark' },
    { tone: LOGO_TONE.Mono, label: 'Shelfmark' },
  ])('has no axe violations for %o', async (inputs) => {
    const { host } = render(inputs);
    expect(await axeViolations(host)).toEqual([]);
  });
});
