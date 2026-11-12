import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import type { RadioOption } from './models/radio-option.interface';
import { RadioGroupComponent } from './radio-group.component';
import { RADIO_ORIENTATION } from './models/radio-orientation.const';

const OPTIONS: RadioOption[] = [
  { value: 'move', title: 'Move links to Unsorted', description: 'The folders go, all links stay' },
  { value: 'delete', title: 'Delete links too', description: "This can't be undone" },
  { value: 'plain', title: 'No description' },
];

function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(RadioGroupComponent);
  fixture.componentRef.setInput('options', OPTIONS);
  fixture.componentRef.setInput('ariaLabel', 'Folder deletion');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const radios = () => [...host.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  return { fixture, host, radios };
}

describe('RadioGroupComponent', () => {
  it('is a named radiogroup of native radios sharing one name', () => {
    const { host, radios } = setup();
    expect(host.getAttribute('role')).toBe('radiogroup');
    expect(host.getAttribute('aria-label')).toBe('Folder deletion');
    expect(radios()).toHaveLength(3);
    expect(new Set(radios().map((r) => r.name)).size).toBe(1);
    expect(radios()[0].name).not.toBe('');
  });

  it('uses the name input and labelledby when given', () => {
    const { host, radios } = setup({ name: 'mode', ariaLabel: '', ariaLabelledby: 'heading' });
    expect(radios().every((r) => r.name === 'mode')).toBe(true);
    expect(host.getAttribute('aria-label')).toBeNull();
    expect(host.getAttribute('aria-labelledby')).toBe('heading');
  });

  it('shows title and description and links the description to its radio', () => {
    const { host, radios } = setup();
    const titles = [...host.querySelectorAll('.ui-radio__title')].map((e) => e.textContent);
    expect(titles).toEqual(['Move links to Unsorted', 'Delete links too', 'No description']);
    const descId = radios()[0].getAttribute('aria-describedby') ?? '';
    expect(host.querySelector(`#${descId}`)?.textContent).toBe('The folders go, all links stay');
    expect(radios()[2].getAttribute('aria-describedby')).toBeNull();
  });

  it('checks the option equal to the value and marks it', () => {
    const { fixture, host, radios } = setup({ value: 'move' });
    expect(radios().map((r) => r.checked)).toEqual([true, false, false]);
    expect(host.querySelectorAll('.ui-radio--checked')).toHaveLength(1);
    fixture.componentInstance.value.set('delete');
    fixture.detectChanges();
    expect(radios().map((r) => r.checked)).toEqual([false, true, false]);
  });

  it('writes a choice into the value model', () => {
    const { fixture, radios } = setup({ value: 'move' });
    radios()[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('delete');
  });

  it('is vertical by default and a row when horizontal', () => {
    expect(setup().host.classList.contains('ui-radio-group--row')).toBe(false);
    expect(
      setup({ orientation: RADIO_ORIENTATION.Horizontal }).host.classList.contains(
        'ui-radio-group--row',
      ),
    ).toBe(true);
  });

  it('disables every radio', () => {
    const { host, radios } = setup({ disabled: true });
    expect(radios().every((r) => r.disabled)).toBe(true);
    expect(host.getAttribute('aria-disabled')).toBe('true');
  });

  it('focus() goes to the checked radio, else the first', () => {
    const { fixture, host, radios } = setup();
    document.body.append(host);
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(radios()[0]);
    fixture.componentInstance.value.set('delete');
    fixture.detectChanges();
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(radios()[1]);
    host.remove();
  });

  it('emits touch only when focus leaves the group', () => {
    const { fixture, host, radios } = setup();
    const spy = vi.fn();
    fixture.componentInstance.touch.subscribe(spy);
    radios()[0].dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: radios()[1] }),
    );
    expect(spy).not.toHaveBeenCalled();
    radios()[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(spy).toHaveBeenCalledOnce();
    expect(host).toBeTruthy();
  });

  it.each([
    ['default', {}],
    ['selected, horizontal', { value: 'move', orientation: RADIO_ORIENTATION.Horizontal }],
    ['disabled', { disabled: true }],
  ])('has no axe violations (%s)', async (_name, inputs) => {
    expect(await axeViolations(setup(inputs).host)).toEqual([]);
  });

  it('leads an option with a flag or an icon and sets the title language (#315)', () => {
    const { host } = setup({
      options: [
        { value: 'de', title: 'Deutsch', flag: 'de', lang: 'de' },
        { value: 'browser', title: 'Match my browser', icon: 'monitor' },
        { value: 'plain', title: 'Plain' },
      ],
    });
    const labels = [...host.querySelectorAll('label')];
    expect(labels[0].querySelector('ui-flag img')?.getAttribute('src')).toContain('flags/de.svg');
    expect(labels[0].querySelector('.ui-radio__title')?.getAttribute('lang')).toBe('de');
    expect(labels[1].querySelector('ui-flag')).toBeNull();
    expect(labels[1].querySelector('ui-icon')).not.toBeNull();
    expect(labels[1].querySelector('.ui-radio__title')?.hasAttribute('lang')).toBe(false);
    expect(labels[2].querySelector('ui-flag, ui-icon')).toBeNull();
    // The flag and the icon are decorative: the radio is named by its title only.
    expect(labels[0].textContent?.trim()).toBe('Deutsch');
  });
});
