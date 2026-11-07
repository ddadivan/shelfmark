import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../testing/axe';
import type { SpinnerSize } from './models/spinner-size.type';
import { SpinnerComponent } from './spinner.component';
import { SPINNER_SIZE } from './models/spinner-size.const';

function setup(inputs: { size?: SpinnerSize; label?: string } = {}) {
  const fixture = TestBed.createComponent(SpinnerComponent);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('SpinnerComponent', () => {
  it('renders a medium ring by default', () => {
    const { host } = setup();
    expect(host.classList.contains('ui-spinner')).toBe(true);
    expect(host.classList.contains('ui-spinner--sm')).toBe(false);
    expect(host.classList.contains('ui-spinner--lg')).toBe(false);
    expect(host.querySelector('.ui-spinner__ring')).not.toBeNull();
  });

  it.each<SpinnerSize>([SPINNER_SIZE.Sm, SPINNER_SIZE.Lg])('applies the %s size class', (size) => {
    const { host } = setup({ size });
    expect(host.classList.contains(`ui-spinner--${size}`)).toBe(true);
  });

  it('is decorative without a label', () => {
    const { host } = setup();
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.hasAttribute('role')).toBe(false);
    expect(host.hasAttribute('aria-label')).toBe(false);
  });

  it('is a status region with a label: empty first, then the hidden text', async () => {
    const { fixture, host } = setup({ label: 'Loading' });
    const text = host.querySelector('.ui-spinner__text') as HTMLElement;
    expect(host.getAttribute('role')).toBe('status');
    expect(host.hasAttribute('aria-label')).toBe(false);
    expect(host.hasAttribute('aria-hidden')).toBe(false);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text.textContent).toBe('Loading');
    fixture.componentRef.setInput('label', 'Saving');
    fixture.detectChanges();
    expect(text.textContent).toBe('Saving');
  });

  it('has no text node without a label', () => {
    expect(setup().host.querySelector('.ui-spinner__text')).toBeNull();
  });

  it('has no axe violations, decorative or labelled', async () => {
    expect(await axeViolations(setup().host)).toEqual([]);
    expect(await axeViolations(setup({ label: 'Loading' }).host)).toEqual([]);
  });
});
