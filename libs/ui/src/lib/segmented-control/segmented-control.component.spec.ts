import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../testing/axe';
import type { SegmentedOption } from './models/segmented-option.interface';
import { SegmentedControlComponent } from './segmented-control.component';

const VIEW: SegmentedOption[] = [
  { value: 'cards', label: 'Cards', icon: 'cards' },
  { value: 'list', label: 'List', icon: 'list' },
];
const THEME_OPTIONS: SegmentedOption[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark', disabled: true },
];

function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(SegmentedControlComponent);
  fixture.componentRef.setInput('options', VIEW);
  fixture.componentRef.setInput('ariaLabel', 'View');
  fixture.componentRef.setInput('value', 'cards');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const radios = () => [...host.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  return { fixture, host, radios };
}

describe('SegmentedControlComponent', () => {
  it('is a named radiogroup of native radios sharing one name', () => {
    const { host, radios } = setup();
    expect(host.getAttribute('role')).toBe('radiogroup');
    expect(host.getAttribute('aria-label')).toBe('View');
    expect(radios()).toHaveLength(2);
    expect(new Set(radios().map((r) => r.name)).size).toBe(1);
    expect(radios()[0].name).not.toBe('');
  });

  it('uses the name input and labelledby when given', () => {
    const { host, radios } = setup({ name: 'view', ariaLabel: '', ariaLabelledby: 'h' });
    expect(radios().every((r) => r.name === 'view')).toBe(true);
    expect(host.getAttribute('aria-label')).toBeNull();
    expect(host.getAttribute('aria-labelledby')).toBe('h');
  });

  it('shows icon and label, and marks the active option', () => {
    const { host, radios } = setup();
    expect(host.querySelectorAll('ui-icon')).toHaveLength(2);
    expect([...host.querySelectorAll('.ui-seg__label')].map((e) => e.textContent)).toEqual([
      'Cards',
      'List',
    ]);
    expect(radios().map((r) => r.checked)).toEqual([true, false]);
    expect(host.querySelectorAll('.is-active')).toHaveLength(1);
    expect(radios()[0].hasAttribute('aria-label')).toBe(false);
  });

  it('renders label-only options without icons', () => {
    const { host } = setup({ options: THEME_OPTIONS });
    expect(host.querySelectorAll('ui-icon')).toHaveLength(0);
  });

  it('iconOnly drops the text and names each radio by its label', () => {
    const { host, radios } = setup({ iconOnly: true });
    expect(host.querySelectorAll('.ui-seg__label')).toHaveLength(0);
    expect(radios().map((r) => r.getAttribute('aria-label'))).toEqual(['Cards', 'List']);
  });

  it('positions the thumb from the selected index and option count', () => {
    const { fixture, host } = setup({ options: THEME_OPTIONS, value: 'light' });
    expect(host.style.getPropertyValue('--seg-n')).toBe('3');
    expect(host.style.getPropertyValue('--seg-i')).toBe('1');
    fixture.componentInstance.value.set('system');
    fixture.detectChanges();
    expect(host.style.getPropertyValue('--seg-i')).toBe('0');
  });

  it('hides the thumb when nothing is selected', () => {
    const { host } = setup({ value: '' });
    expect(host.classList.contains('ui-seg--none')).toBe(true);
  });

  it('writes a choice into the value model', () => {
    const { fixture, radios } = setup();
    radios()[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('list');
    expect(radios().map((r) => r.checked)).toEqual([false, true]);
  });

  it('disables single options', () => {
    const { host, radios } = setup({ options: THEME_OPTIONS, value: 'system' });
    expect(radios().map((r) => r.disabled)).toEqual([false, false, true]);
    expect(host.querySelectorAll('.is-disabled')).toHaveLength(1);
  });

  it('disables the whole group', () => {
    const { host, radios } = setup({ disabled: true });
    expect(radios().every((r) => r.disabled)).toBe(true);
    expect(host.getAttribute('aria-disabled')).toBe('true');
    expect(host.classList.contains('ui-seg--disabled')).toBe(true);
  });

  it('focus() goes to the checked radio, else the first enabled one', () => {
    const { fixture, host, radios } = setup({ options: THEME_OPTIONS, value: 'light' });
    document.body.append(host);
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(radios()[1]);
    fixture.componentInstance.value.set('');
    fixture.detectChanges();
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(radios()[0]);
    host.remove();
  });

  it('emits touch only when focus leaves the group', () => {
    const { fixture, radios } = setup();
    const spy = vi.fn();
    fixture.componentInstance.touch.subscribe(spy);
    radios()[0].dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: radios()[1] }),
    );
    expect(spy).not.toHaveBeenCalled();
    radios()[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(spy).toHaveBeenCalledOnce();
  });

  it('keeps every option reachable by Tab through the native radio group', () => {
    // Native radios share a name, so the browser gives the arrow-key movement and the single
    // tab stop; the unit test asserts the markup it relies on.
    const { radios } = setup();
    expect(radios().every((r) => r.type === 'radio' && r.tabIndex === 0)).toBe(true);
  });

  it('throws in dev mode for a bad option count or icon-only without icons', () => {
    expect(() => {
      const { fixture } = setup({ options: [VIEW[0]] });
      fixture.detectChanges();
      TestBed.tick();
    }).toThrow(/2 to 4 options/);
    expect(() => {
      setup({ options: THEME_OPTIONS, iconOnly: true });
      TestBed.tick();
    }).toThrow(/icon on every option/);
  });

  it.each([
    ['icons and labels', {}],
    ['icon only', { iconOnly: true }],
    ['labels, one disabled', { options: THEME_OPTIONS, value: 'system' }],
    ['disabled', { disabled: true }],
  ])('has no axe violations (%s)', async (_name, inputs) => {
    expect(await axeViolations(setup(inputs).host)).toEqual([]);
  });
});
