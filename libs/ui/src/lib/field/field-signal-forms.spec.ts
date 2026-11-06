import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  disabled,
  form,
  FormField,
  maxLength,
  pattern,
  required,
  submit,
} from '@angular/forms/signals';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { InputComponent } from '../input/input.component';
import type { RadioOption } from '../radio-group/models/radio-option.interface';
import { RadioGroupComponent } from '../radio-group/radio-group.component';
import { TextareaComponent } from '../textarea/textarea.component';

@Component({
  selector: 'ui-test-form',
  imports: [InputComponent, TextareaComponent, RadioGroupComponent, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-input label="Link" type="url" [formField]="f.url" />
    <ui-textarea label="Note" counterLabel="characters" [formField]="f.note" />
    <ui-radio-group ariaLabel="Mode" [options]="options" [formField]="f.mode" />
  `,
})
class TestFormComponent {
  readonly options: RadioOption[] = [
    { value: 'move', title: 'Move', description: 'Keep links' },
    { value: 'delete', title: 'Delete' },
  ];
  readonly model = signal({ url: '', note: '', mode: 'move' });
  readonly lockUrl = signal(false);
  readonly f = form(this.model, (p) => {
    required(p.url, { message: 'Enter a link' });
    pattern(p.url, /^https?:\/\//, { message: 'Enter an address that starts with https://' });
    maxLength(p.note, 10, { message: 'Keep it short' });
    disabled(p.url, () => this.lockUrl());
  });
}

function setup() {
  const fixture = TestBed.createComponent(TestFormComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host,
    cmp: fixture.componentInstance,
    input: host.querySelector('ui-input input') as HTMLInputElement,
    area: host.querySelector('ui-textarea textarea') as HTMLTextAreaElement,
    radios: () => [...host.querySelectorAll<HTMLInputElement>('ui-radio-group input')],
    error: () => host.querySelector('ui-input .ui-field__error')?.textContent,
  };
}

function type(el: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  el.value = text;
  el.dispatchEvent(new Event('input'));
}

describe('Signal Forms integration', () => {
  it('writes typed values into the model and model changes into the controls', async () => {
    const { fixture, cmp, input, area } = setup();
    type(input, 'https://a.b');
    type(area, 'note');
    await fixture.whenStable();
    expect(cmp.model().url).toBe('https://a.b');
    expect(cmp.model().note).toBe('note');

    cmp.model.set({ url: 'https://c.d', note: 'x', mode: 'delete' });
    await fixture.whenStable();
    expect(input.value).toBe('https://c.d');
    expect(area.value).toBe('x');
  });

  it('shows required and pattern errors only after the field is touched', async () => {
    const { fixture, input, error } = setup();
    await fixture.whenStable();
    expect(error()).toBe('');
    expect(input.getAttribute('aria-invalid')).toBeNull();

    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(error()).toBe('Enter a link');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain('-error');

    type(input, 'youtube com');
    await fixture.whenStable();
    expect(error()).toBe('Enter an address that starts with https://');

    type(input, 'https://youtube.com');
    await fixture.whenStable();
    expect(error()).toBe('');
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('shows all errors after a submit attempt', async () => {
    const { fixture, cmp, error } = setup();
    await submit(cmp.f, async () => undefined);
    await fixture.whenStable();
    expect(error()).toBe('Enter a link');
  });

  it('takes disabled from the form', async () => {
    const { fixture, cmp, input } = setup();
    expect(input.disabled).toBe(false);
    cmp.lockUrl.set(true);
    await fixture.whenStable();
    expect(input.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.ui-field--disabled')).not.toBeNull();
  });

  it('takes maxLength from the form and shows the counter', async () => {
    const { fixture, cmp, area, host } = setup();
    await fixture.whenStable();
    expect(area.getAttribute('maxlength')).toBeNull();
    type(area, 'abcd');
    await fixture.whenStable();
    expect(host.querySelector('ui-textarea .ui-field__counter')?.textContent).toContain('4 / 10');
    expect(cmp.model().note).toBe('abcd');
  });

  it('reports a value over the limit (loaded or pasted) as an error after touch', async () => {
    const { fixture, cmp, area, host } = setup();
    cmp.model.update((m) => ({ ...m, note: 'x'.repeat(12) }));
    await fixture.whenStable();
    expect(host.querySelector('ui-textarea .ui-field__counter')?.textContent).toContain('12 / 10');
    area.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(host.querySelector('ui-textarea .ui-field__error')?.textContent).toBe('Keep it short');
    expect(area.getAttribute('aria-invalid')).toBe('true');
  });

  it('marks the field required from a required rule', async () => {
    const { fixture, input } = setup();
    await fixture.whenStable();
    expect(input.getAttribute('aria-required')).toBe('true');
  });

  it('binds the radio group both ways', async () => {
    const { fixture, cmp, radios } = setup();
    await fixture.whenStable();
    expect(radios().map((r) => r.checked)).toEqual([true, false]);
    radios()[1].click();
    await fixture.whenStable();
    expect(cmp.model().mode).toBe('delete');
    cmp.model.update((m) => ({ ...m, mode: 'move' }));
    await fixture.whenStable();
    expect(radios().map((r) => r.checked)).toEqual([true, false]);
  });

  it('marks the radio group touched when focus leaves it', async () => {
    const { fixture, cmp, radios } = setup();
    radios()[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    await fixture.whenStable();
    expect(cmp.f.mode().touched()).toBe(true);
  });

  it('has no axe violations with errors shown', async () => {
    const { fixture, host, input } = setup();
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(await axeViolations(host)).toEqual([]);
  });
});
