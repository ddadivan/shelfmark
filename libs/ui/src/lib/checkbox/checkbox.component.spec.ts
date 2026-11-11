import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { disabled, form, FormField, required } from '@angular/forms/signals';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { compileScss } from '../../testing/scss';
import { CheckboxComponent } from './checkbox.component';

function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(CheckboxComponent);
  fixture.componentRef.setInput('label', 'Add to favorites');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const input = () => host.querySelector('input') as HTMLInputElement;
  return { fixture, host, input };
}

@Component({
  imports: [CheckboxComponent, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ui-checkbox label="Favorite" [formField]="f.favorite" />`,
})
class FormHostComponent {
  readonly model = signal({ favorite: false });
  readonly lock = signal(false);
  readonly f = form(this.model, (p) => {
    required(p.favorite, { message: 'Must be on' });
    disabled(p.favorite, () => this.lock());
  });
}

describe('CheckboxComponent', () => {
  it('renders a labelled native checkbox, unchecked by default', () => {
    const { host, input } = setup();
    expect(input().type).toBe('checkbox');
    expect(input().checked).toBe(false);
    expect(host.querySelector('label')?.textContent).toContain('Add to favorites');
    expect(host.querySelector('label')?.getAttribute('for')).toBe(input().id);
  });

  it('toggles on click and writes the checked model', () => {
    const { fixture, input, host } = setup();
    input().click();
    fixture.detectChanges();
    expect(fixture.componentInstance.checked()).toBe(true);
    expect(host.classList).toContain('ui-checkbox--checked');
    input().click();
    expect(fixture.componentInstance.checked()).toBe(false);
  });

  it('hideLabel keeps the label as the accessible name but draws only the box', () => {
    const { host, input } = setup({ hideLabel: true });
    const text = host.querySelector('.ui-checkbox__text') as HTMLElement;
    expect(text.classList).toContain('ui-checkbox__text--hidden');
    expect(host.querySelector('label')?.getAttribute('for')).toBe(input().id);
    expect(text.textContent).toBe('Add to favorites');
  });

  it('shows the hint and links it with aria-describedby', () => {
    const { host, input } = setup({ hint: 'Shown first in the feed' });
    const hint = host.querySelector('.ui-checkbox__hint');
    expect(hint?.textContent).toBe('Shown first in the feed');
    expect(input().getAttribute('aria-describedby')).toContain(hint?.id ?? 'x');
  });

  it('shows a manual error and marks the input invalid', () => {
    const { host, input } = setup({ error: 'Required' });
    expect(host.querySelector('.ui-checkbox__error')?.textContent).toBe('Required');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(host.classList).toContain('ui-checkbox--invalid');
  });

  it('disables the native input', () => {
    const { host, input } = setup({ disabled: true });
    expect(input().disabled).toBe(true);
    expect(host.classList).toContain('ui-checkbox--disabled');
  });

  it('sets aria-required and a name', () => {
    const { input } = setup({ required: true, name: 'favorite' });
    expect(input().getAttribute('aria-required')).toBe('true');
    expect(input().name).toBe('favorite');
  });

  it('shows the mixed state and clears it on toggle', () => {
    const { fixture, input, host } = setup({ indeterminate: true });
    expect(input().indeterminate).toBe(true);
    expect(host.querySelector('.ui-checkbox__dash')).not.toBeNull();
    input().click();
    fixture.detectChanges();
    expect(fixture.componentInstance.indeterminate()).toBe(false);
    expect(host.querySelector('.ui-checkbox__dash')).toBeNull();
  });

  it('emits touch on blur and focuses through focus()', () => {
    const { fixture, input } = setup();
    let touches = 0;
    fixture.componentInstance.touch.subscribe(() => (touches += 1));
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(input());
    input().dispatchEvent(new Event('blur'));
    expect(touches).toBe(1);
  });

  it('works with Signal Forms', () => {
    const fixture = TestBed.createComponent(FormHostComponent);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    expect(input.checked).toBe(false);
    input.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.model().favorite).toBe(true);
    fixture.componentInstance.model.set({ favorite: false });
    fixture.detectChanges();
    expect(input.checked).toBe(false);
    fixture.componentInstance.lock.set(true);
    fixture.detectChanges();
    expect(input.disabled).toBe(true);
  });

  it('re-syncs the native input when the consumer sets the value back', () => {
    const { fixture, input } = setup();
    input().click();
    fixture.detectChanges();
    expect(input().checked).toBe(true);
    fixture.componentRef.setInput('checked', false);
    fixture.detectChanges();
    expect(input().checked).toBe(false);
  });

  it('keeps the error live region in the DOM while empty and hides the hint under an error', () => {
    const { fixture, host } = setup({ hint: 'A hint' });
    const region = host.querySelector('.ui-checkbox__error');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.textContent).toBe('');
    expect(host.querySelector('.ui-checkbox__hint--hidden')).toBeNull();
    fixture.componentRef.setInput('error', 'Oops');
    fixture.detectChanges();
    expect(host.querySelector('.ui-checkbox__error')).toBe(region);
    expect(region?.textContent).toBe('Oops');
    expect(host.querySelector('.ui-checkbox__hint--hidden')).not.toBeNull();
  });

  it('cancels the flex gap of the empty error region (compiled CSS)', () => {
    const css = compileScss('lib/checkbox/checkbox.component.scss');
    expect(css).toMatch(/\.ui-checkbox__error:empty\s*{[^}]*margin-block-start: -0\.125rem/);
    expect(css).toMatch(/:host\s*{[^}]*gap: 0\.125rem/);
    expect(css).not.toMatch(/\.ui-checkbox__error[^{]*{[^}]*display: none/);
  });

  it('has no axe violations in any state', async () => {
    const plain = setup({ hint: 'A hint' });
    expect(await axeViolations(plain.host)).toEqual([]);
    const checked = setup({ checked: true, error: 'Oops' });
    expect(await axeViolations(checked.host)).toEqual([]);
    const off = setup({ disabled: true, indeterminate: true });
    expect(await axeViolations(off.host)).toEqual([]);
  });
});
