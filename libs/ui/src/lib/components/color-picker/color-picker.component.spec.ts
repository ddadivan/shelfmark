import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { ColorPickerComponent } from './color-picker.component';

const LABELS = {
  label: 'Your own colour',
  pickerLabel: 'Colour',
  saturationLabel: 'Saturation',
  brightnessLabel: 'Brightness',
  hueLabel: 'Hue',
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
  const slider = (label: string) =>
    host.querySelector(`input[type="range"][aria-label="${label}"]`) as HTMLInputElement;
  const area = () => host.querySelector('.ui-color-picker__area') as HTMLElement;
  const open = async () => {
    swatch().click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { fixture, host, swatch, panel, hex, slider, area, open, committed };
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
    saturationLabel="Sat"
    brightnessLabel="Bright"
    hueLabel="Hue"
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

    await vi.waitFor(() => {
      expect(panel()).toBeNull();
    });
    expect(document.activeElement).toBe(swatch());
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('labels the area, the three sliders and the hex field, with a value text each', async () => {
    const { host, hex, slider, open } = setup({ value: '#ff0000' });
    await open();
    expect(host.querySelector('.ui-color-picker__area')?.getAttribute('aria-label')).toBe('Colour');
    expect(slider('Hue').getAttribute('aria-valuetext')).toBe('0°');
    expect(slider('Saturation').getAttribute('aria-valuetext')).toBe('100%');
    expect(slider('Brightness').getAttribute('aria-valuetext')).toBe('100%');
    const label = host.querySelector(`label[for="${hex().id}"]`);
    expect(label?.textContent).toContain('Hex code');
  });

  it('the hue slider and the area sliders move the colour live and commit when let go', async () => {
    const { fixture, slider, open, committed } = setup({ value: '#ff0000' });
    await open();

    const hue = slider('Hue');
    hue.value = '120';
    hue.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('#00ff00');
    expect(committed).toEqual([]);
    hue.dispatchEvent(new Event('change'));
    expect(committed).toEqual(['#00ff00']);

    const brightness = slider('Brightness');
    brightness.value = '50';
    brightness.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('#008000');
    brightness.dispatchEvent(new Event('blur'));
    expect(committed).toEqual(['#00ff00', '#008000']);
    // Nothing changed since: letting go again commits nothing more.
    brightness.dispatchEvent(new Event('blur'));
    expect(committed).toHaveLength(2);
  });

  it('keeps the hue while the colour is grey (the hex cannot hold it)', async () => {
    const { fixture, slider, open } = setup({ value: '#ff0000' });
    await open();
    const saturation = slider('Saturation');
    saturation.value = '0';
    saturation.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('#ffffff');
    expect(slider('Hue').value).toBe('0');
    const hue = slider('Hue');
    hue.value = '200';
    hue.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    saturation.value = '0';
    saturation.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(slider('Hue').value).toBe('200');
  });

  it('a pointer in the area sets saturation and brightness and commits on release', async () => {
    const { fixture, area, open, committed } = setup({ value: '#ff0000' });
    await open();
    const box = area();
    box.getBoundingClientRect = () => new DOMRect(0, 0, 200, 100);
    box.setPointerCapture = () => undefined;
    box.releasePointerCapture = () => undefined;
    const fire = (type: string, x: number, y: number) =>
      box.dispatchEvent(
        new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true }),
      );
    fire('pointerdown', 100, 50);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('#804040');
    expect(committed).toEqual([]);
    fire('pointermove', 200, 0);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('#ff0000');
    fire('pointermove', 0, 100);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('#000000');
    fire('pointerup', 0, 100);
    expect(committed).toEqual(['#000000']);
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
    await vi.waitFor(() => {
      expect(panel()).toBeNull();
    });
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
