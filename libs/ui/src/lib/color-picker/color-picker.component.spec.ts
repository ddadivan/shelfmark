import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { ColorPickerComponent } from './color-picker.component';

const LABELS = {
  label: 'Your own colour',
  pickerLabel: 'Choose a colour',
  hexLabel: 'Hex code',
  invalidMessage: 'Enter a colour like #2e6a99',
};

function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(ColorPickerComponent);
  for (const [name, value] of Object.entries({ ...LABELS, ...inputs })) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const committed: string[] = [];
  fixture.componentInstance.committed.subscribe((colour) => committed.push(colour));
  const swatch = () => host.querySelector('.ui-color-picker__swatch') as HTMLButtonElement;
  const panel = () => host.querySelector<HTMLElement>('.ui-color-picker__panel');
  const hex = () => host.querySelector('.ui-color-picker__hex-input') as HTMLInputElement;
  const native = () => host.querySelector('input[type="color"]') as HTMLInputElement;
  const open = async () => {
    swatch().click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { fixture, host, swatch, panel, hex, native, open, committed };
}

function type(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new Event('input'));
}

@Component({
  imports: [ColorPickerComponent, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ui-color-picker
    label="Own"
    pickerLabel="Pick"
    hexLabel="Hex"
    invalidMessage="Bad"
    [formField]="f.colour"
  />`,
})
class FormHostComponent {
  readonly model = signal({ colour: '#123456' });
  readonly f = form(this.model);
}

describe('ColorPickerComponent', () => {
  it('is a swatch button named by its label that discloses the panel', async () => {
    const { swatch, panel, open, host } = setup();
    expect(swatch().type).toBe('button');
    expect(swatch().getAttribute('aria-label')).toBe('Your own colour');
    expect(swatch().getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('.ui-color-picker__plus')).not.toBeNull();
    expect(panel()).toBeNull();

    await open();

    expect(swatch().getAttribute('aria-expanded')).toBe('true');
    expect(panel()?.id).toBe(swatch().getAttribute('aria-controls'));
    expect(panel()?.getAttribute('role')).toBe('group');
    expect(panel()?.getAttribute('aria-label')).toBe('Your own colour');
  });

  it('moves focus into the hex field on open, and Esc closes and returns to the swatch', async () => {
    const { fixture, swatch, panel, hex, open } = setup();
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    await open();
    expect(document.activeElement).toBe(hex());

    hex().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(swatch());
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('labels the system picker and the hex field', async () => {
    const { host, hex, native, open } = setup();
    await open();
    expect(native().closest('label')?.textContent).toContain('Choose a colour');
    const label = host.querySelector(`label[for="${hex().id}"]`);
    expect(label?.textContent).toContain('Hex code');
  });

  it('follows the system picker live and commits when it closes', async () => {
    const { fixture, native, open, committed } = setup();
    await open();
    expect(native().value).toBe('#2e6a99');

    type(native(), '#AA3300');
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('#aa3300');
    expect(committed).toEqual([]);

    native().dispatchEvent(new Event('change'));
    expect(committed).toEqual(['#aa3300']);
  });

  it('commits a typed hex on Enter or blur, with or without #, in lower case', async () => {
    const { fixture, hex, open, committed } = setup();
    await open();
    type(hex(), 'C0FFEE');
    hex().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(committed).toEqual(['#c0ffee']);
    expect(fixture.componentInstance.value()).toBe('#c0ffee');
    expect(hex().value).toBe('#c0ffee');

    type(hex(), '#123abc');
    hex().dispatchEvent(new Event('blur'));
    expect(committed).toEqual(['#c0ffee', '#123abc']);
  });

  it('flags text that is not a colour and commits nothing', async () => {
    const { fixture, host, hex, open, committed } = setup();
    await open();
    type(hex(), '#12');
    fixture.detectChanges();
    hex().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(committed).toEqual([]);
    expect(hex().getAttribute('aria-invalid')).toBe('true');
    const error = host.querySelector('.ui-color-picker__error');
    expect(error?.textContent).toContain('Enter a colour like #2e6a99');
    expect(hex().getAttribute('aria-describedby')).toBe(error?.id);
  });

  it('paints a chosen colour and draws the selected ring', () => {
    const { host, swatch } = setup({ value: '#2e6a99', selected: true });
    expect(swatch().classList).toContain('ui-color-picker__swatch--own');
    expect(swatch().classList).toContain('ui-color-picker__swatch--selected');
    expect(host.querySelector('.ui-color-picker__plus')).toBeNull();
    const paint = host.querySelector('.ui-color-picker__paint') as HTMLElement;
    expect(paint.style.backgroundColor).toBe('rgb(46, 106, 153)');
  });

  it('toggles closed from the swatch and stays shut when disabled', async () => {
    const { fixture, swatch, panel, open } = setup();
    await open();
    await open();
    expect(panel()).toBeNull();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(swatch().disabled).toBe(true);
  });

  it('works as a Signal Forms field', async () => {
    const fixture = TestBed.createComponent(FormHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const paint = host.querySelector('.ui-color-picker__paint') as HTMLElement;
    expect(paint.style.backgroundColor).toBe('rgb(18, 52, 86)');
  });

  it('has no axe violations, closed and open', async () => {
    const { host, open } = setup();
    expect(await axeViolations(host)).toEqual([]);
    await open();
    expect(await axeViolations(host)).toEqual([]);
  });
});
