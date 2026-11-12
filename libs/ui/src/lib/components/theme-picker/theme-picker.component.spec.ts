import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { THEME_ATTRIBUTE } from '../../models/theme';
import { THEME_PICKER_KIND } from './models/theme-picker-kind.const';
import type { ThemePickerOption } from './models/theme-picker-option.interface';
import { ThemePickerComponent } from './theme-picker.component';

const THEMES: ThemePickerOption[] = [
  { value: 'system', label: 'System', theme: 'system' },
  { value: 'light', label: 'Light', theme: 'light' },
  { value: 'dark', label: 'Dark', theme: 'dark' },
  {
    value: 'custom',
    label: 'Custom',
    theme: 'custom',
    base: 'dark',
    accent: 'rose',
    background: 'ink',
    corners: 'soft',
  },
];
const ACCENTS: ThemePickerOption[] = [
  { value: 'ocean', label: 'Ocean', theme: 'custom', base: 'light', accent: 'ocean' },
  { value: 'rose', label: 'Rose', theme: 'custom', base: 'light', accent: 'rose' },
];

function setup(inputs: Record<string, unknown> = {}, options: ThemePickerOption[] = THEMES) {
  const fixture = TestBed.createComponent(ThemePickerComponent);
  fixture.componentRef.setInput('options', options);
  fixture.componentRef.setInput('ariaLabel', 'Theme');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const radios = () => [...host.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  return { fixture, host, radios };
}

describe('ThemePickerComponent', () => {
  it('is a named radiogroup of native radios that share a name', () => {
    const { host, radios } = setup();
    expect(host.getAttribute('role')).toBe('radiogroup');
    expect(host.getAttribute('aria-label')).toBe('Theme');
    expect(host.classList).toContain('ui-theme-picker--theme');
    expect(radios()).toHaveLength(4);
    expect(new Set(radios().map((r) => r.name)).size).toBe(1);
  });

  it('captions theme options and names each radio by its caption', () => {
    const { host, radios } = setup();
    const labels = [...host.querySelectorAll('.ui-theme-picker__label')].map((l) =>
      l.textContent?.trim(),
    );
    expect(labels).toEqual(['System', 'Light', 'Dark', 'Custom']);
    expect(radios()[0].getAttribute('aria-label')).toBeNull();
  });

  it('draws each option under its own theme attributes, system as both halves', () => {
    const { host } = setup();
    const halves = host.querySelectorAll('.ui-theme-picker__half');
    expect([...halves].map((h) => h.getAttribute(THEME_ATTRIBUTE))).toEqual(['light', 'dark']);
    const paints = [...host.querySelectorAll('.ui-theme-picker__paint')];
    expect(paints.map((p) => p.getAttribute(THEME_ATTRIBUTE))).toEqual(['light', 'dark', 'custom']);
    const custom = paints[2];
    expect(custom.getAttribute('data-custom-base')).toBe('dark');
    expect(custom.getAttribute('data-custom-accent')).toBe('rose');
    expect(custom.getAttribute('data-custom-background')).toBe('ink');
    expect(custom.getAttribute('data-custom-corners')).toBe('soft');
    expect(paints[0].hasAttribute('data-custom-accent')).toBe(false);
    expect(host.querySelectorAll('.ui-theme-picker__surface')).toHaveLength(5);
  });

  it('sets the token values of an option as custom properties on its drawing (own accent)', () => {
    const { host } = setup({}, [
      { ...THEMES[3], accent: 'own', tokens: { '--accent': '#2e6a99', '--accent-bg': '#ddeaf4' } },
    ]);
    const paint = host.querySelector('.ui-theme-picker__paint') as HTMLElement;
    expect(paint.style.getPropertyValue('--accent')).toBe('#2e6a99');
    expect(paint.style.getPropertyValue('--accent-bg')).toBe('#ddeaf4');
  });

  it('checks and marks the option equal to the value; a choice writes the model', () => {
    const { fixture, host, radios } = setup({ value: 'dark' });
    expect(radios().map((r) => r.checked)).toEqual([false, false, true, false]);
    expect(host.querySelectorAll('.ui-theme-picker__option--checked')).toHaveLength(1);
    radios()[3].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('custom');
  });

  it('draws accents as swatches named by aria-label, without captions', () => {
    const { host, radios } = setup({ kind: THEME_PICKER_KIND.Accent }, ACCENTS);
    expect(host.classList).toContain('ui-theme-picker--accent');
    expect(radios().map((r) => r.getAttribute('aria-label'))).toEqual(['Ocean', 'Rose']);
    expect(host.querySelector('.ui-theme-picker__label')).toBeNull();
    expect(host.querySelector('.ui-theme-picker__surface')).toBeNull();
  });

  it('captions background tiles', () => {
    const backgrounds: ThemePickerOption[] = [
      { value: 'stone', label: 'Stone', theme: 'custom', base: 'light', background: 'stone' },
    ];
    const { host } = setup({ kind: THEME_PICKER_KIND.Background }, backgrounds);
    expect(host.classList).toContain('ui-theme-picker--background');
    expect(host.querySelector('.ui-theme-picker__label')?.textContent?.trim()).toBe('Stone');
  });

  it('uses aria-labelledby and a given name', () => {
    const { host, radios } = setup({ ariaLabel: '', ariaLabelledby: 'h1', name: 'theme' });
    expect(host.getAttribute('aria-label')).toBeNull();
    expect(host.getAttribute('aria-labelledby')).toBe('h1');
    expect(radios().every((r) => r.name === 'theme')).toBe(true);
  });

  it('focuses the checked radio, else the first, and reports touch when focus leaves', () => {
    const { fixture, radios } = setup({ value: 'light' });
    document.body.appendChild(fixture.nativeElement);
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(radios()[1]);
    fixture.componentInstance.value.set('');
    fixture.detectChanges();
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(radios()[0]);
    const touched = vi.fn();
    fixture.componentInstance.touch.subscribe(touched);
    radios()[0].dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: radios()[1] }),
    );
    expect(touched).not.toHaveBeenCalled();
    radios()[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(touched).toHaveBeenCalledTimes(1);
    fixture.nativeElement.remove();
  });

  it('has no axe violations', async () => {
    const { host } = setup({ value: 'light' });
    expect(await axeViolations(host)).toEqual([]);
    const accents = setup({ kind: THEME_PICKER_KIND.Accent, value: 'rose' }, ACCENTS);
    expect(await axeViolations(accents.host)).toEqual([]);
  });
});
