import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { CHOICE_GRID_KIND } from './models/choice-grid-kind.const';
import type { ChoiceOption } from './models/choice-option.interface';
import { ChoiceGridComponent } from './choice-grid.component';

const SWATCHES: ChoiceOption[] = [
  { value: 'graphite', label: 'Graphite', colour: 'graphite' },
  { value: 'clay', label: 'Clay', colour: 'clay' },
  { value: 'teal', label: 'Teal', colour: 'teal' },
];
const ICONS: ChoiceOption[] = [
  { value: 'folder', label: 'Folder', icon: 'folder' },
  { value: 'star', label: 'Star', icon: 'star' },
];

function setup(inputs: Record<string, unknown> = {}, options: ChoiceOption[] = SWATCHES) {
  const fixture = TestBed.createComponent(ChoiceGridComponent);
  fixture.componentRef.setInput('options', options);
  fixture.componentRef.setInput('ariaLabel', 'Colour');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const radios = () => [...host.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  return { fixture, host, radios };
}

describe('ChoiceGridComponent', () => {
  it('is a named radiogroup of native radios, each named by its label', () => {
    const { host, radios } = setup();
    expect(host.getAttribute('role')).toBe('radiogroup');
    expect(host.getAttribute('aria-label')).toBe('Colour');
    expect(radios().map((r) => r.getAttribute('aria-label'))).toEqual(['Graphite', 'Clay', 'Teal']);
    expect(new Set(radios().map((r) => r.name)).size).toBe(1);
  });

  it('checks the option equal to the value and marks it', () => {
    const { fixture, host, radios } = setup({ value: 'clay' });
    expect(radios().map((r) => r.checked)).toEqual([false, true, false]);
    expect(host.querySelectorAll('.ui-choice--checked')).toHaveLength(1);
    fixture.componentInstance.value.set('teal');
    fixture.detectChanges();
    expect(radios().map((r) => r.checked)).toEqual([false, false, true]);
  });

  it('writes a choice into the value model', () => {
    const { fixture, radios } = setup();
    radios()[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('clay');
  });

  it('draws swatches in their own colour', () => {
    const { host } = setup();
    expect(host.querySelectorAll('.ui-choice__swatch')).toHaveLength(3);
    expect(host.querySelector('.ui-choice--clay')).not.toBeNull();
  });

  it('draws icon tiles in the colour of the group', () => {
    const { host } = setup({ kind: CHOICE_GRID_KIND.Icon, colour: 'ocean' }, ICONS);
    expect(host.classList.contains('ui-choice-grid--icon')).toBe(true);
    expect(host.querySelectorAll('.ui-choice--ocean .ui-choice__tile ui-icon')).toHaveLength(2);
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
    fixture.componentInstance.value.set('teal');
    fixture.detectChanges();
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(radios()[2]);
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

  it.each([
    ['swatches', {}, SWATCHES],
    ['icons', { kind: CHOICE_GRID_KIND.Icon, value: 'star' }, ICONS],
  ])('has no axe violations (%s)', async (_name, inputs, options) => {
    expect(await axeViolations(setup(inputs, options).host)).toEqual([]);
  });
});
