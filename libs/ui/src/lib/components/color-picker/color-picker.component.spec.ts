import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { compileScss, mediaBlocks, withoutMedia } from '../../../testing/scss';
import { ColorPickerComponent } from './color-picker.component';

const LABELS = {
  label: 'Your own color',
  pickerLabel: 'Color',
  saturationLabel: 'Saturation',
  brightnessLabel: 'Brightness',
  hueLabel: 'Hue',
  hexLabel: 'Hex code',
  invalidMessage: 'Enter a color like #2e6a99',
  addLabel: 'Add color',
  cancelLabel: 'Cancel',
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
  const action = (name: string) =>
    Array.from(host.querySelectorAll<HTMLButtonElement>('.ui-color-picker__actions button')).find(
      (button) => button.textContent?.trim() === name,
    ) as HTMLButtonElement;
  const open = async () => {
    swatch().click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { fixture, host, swatch, panel, hex, slider, area, action, open, committed };
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
    addLabel="Add"
    cancelLabel="Cancel"
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
    expect(swatch().getAttribute('aria-label')).toBe('Your own color');
    expect(swatch().getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('.ui-color-picker__plus')).not.toBeNull();
    expect(panel()).toBeNull();

    await open();

    expect(swatch().getAttribute('aria-expanded')).toBe('true');
    expect(panel()?.id).toBe(swatch().getAttribute('aria-controls'));
    expect(panel()?.getAttribute('role')).toBe('group');
    expect(panel()?.getAttribute('aria-label')).toBe('Your own color');
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

  it('Esc and Cancel drop the preview: the value goes back to what it was when the panel opened', async () => {
    const { fixture, panel, slider, action, open, committed } = setup({ value: '#ff0000' });
    await open();
    const hue = slider('Hue');
    hue.value = '120';
    hue.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('#00ff00');

    action('Cancel').click();
    fixture.detectChanges();
    await vi.waitFor(() => {
      expect(panel()).toBeNull();
    });
    expect(fixture.componentInstance.value()).toBe('#ff0000');

    await open();
    hue.value = '240';
    slider('Hue').dispatchEvent(new Event('input'));
    fixture.detectChanges();
    slider('Hue').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('#ff0000');
    expect(committed).toEqual([]);
  });

  it('labels the area, the three sliders and the hex field, with a value text each', async () => {
    const { host, hex, slider, open } = setup({ value: '#ff0000' });
    await open();
    expect(host.querySelector('.ui-color-picker__area')?.getAttribute('aria-label')).toBe('Color');
    expect(slider('Hue').getAttribute('aria-valuetext')).toBe('0°');
    expect(slider('Saturation').getAttribute('aria-valuetext')).toBe('100%');
    expect(slider('Brightness').getAttribute('aria-valuetext')).toBe('100%');
    const label = host.querySelector(`label[for="${hex().id}"]`);
    expect(label?.textContent).toContain('Hex code');
  });

  it('the hue slider and the area sliders only preview; "Add color" commits once', async () => {
    const { fixture, slider, action, open, committed } = setup({ value: '#ff0000' });
    await open();

    const hue = slider('Hue');
    hue.value = '120';
    hue.dispatchEvent(new Event('input'));
    hue.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('#00ff00');

    const brightness = slider('Brightness');
    brightness.value = '50';
    brightness.dispatchEvent(new Event('input'));
    brightness.dispatchEvent(new Event('blur'));
    brightness.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('#008000');
    expect(committed).toEqual([]);

    action('Add color').click();
    expect(committed).toEqual(['#008000']);
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

  it('a pointer in the area sets saturation and brightness; releasing it commits nothing', async () => {
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
    expect(fixture.componentInstance.value()).toBe('#000000');
    expect(committed).toEqual([]);
  });

  describe('adjust (#415)', () => {
    /** Accepts anything but black and white: those move to a grey. */
    const adjust = (colour: string): string =>
      colour === '#000000' || colour === '#ffffff' ? '#333333' : colour;

    function pointerArea(area: HTMLElement) {
      area.getBoundingClientRect = () => new DOMRect(0, 0, 200, 100);
      area.setPointerCapture = () => undefined;
      area.releasePointerCapture = () => undefined;
      return (type: string, x: number, y: number) =>
        area.dispatchEvent(
          new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true }),
        );
    }

    it('a pick never moves: the handle stays where it was put and the colour is not adjusted', async () => {
      const { fixture, area, hex, action, open, committed } = setup({ value: '#ff0000', adjust });
      await open();
      const picker = fixture.componentInstance;
      const fire = pointerArea(area());

      fire('pointerdown', 100, 50);
      fire('pointermove', 0, 100);
      fixture.detectChanges();
      expect(picker.value()).toBe('#000000');
      expect(picker.picking()).toBe(true);
      expect(action('Add color').disabled).toBe(true);

      fire('pointerup', 0, 100);
      fixture.detectChanges();
      expect(picker.picking()).toBe(false);
      // Released: still the raw colour, the handle where the pointer was (bottom left).
      expect(picker.value()).toBe('#000000');
      expect(hex().value).toBe('#000000');
      expect(area().style.getPropertyValue('--ui-cp-x')).toBe('0%');
      expect(area().style.getPropertyValue('--ui-cp-y')).toBe('100%');
      // It does not pass, so it cannot be added until the person picks another colour.
      expect(action('Add color').disabled).toBe(true);
      expect(committed).toEqual([]);

      fire('pointerdown', 200, 0);
      fire('pointerup', 200, 0);
      fixture.detectChanges();
      expect(picker.value()).toBe('#ff0000');
      action('Add color').click();
      expect(committed).toEqual(['#ff0000']);
    });

    it('a click at an exact spot keeps the handle there, also where the hex rounds', async () => {
      const { fixture, area, open } = setup({ value: '#ff0000', adjust });
      await open();
      const fire = pointerArea(area());
      fire('pointerdown', 67, 33);
      fire('pointerup', 67, 33);
      fixture.detectChanges();
      expect(area().style.getPropertyValue('--ui-cp-x')).toBe('34%');
      expect(area().style.getPropertyValue('--ui-cp-y')).toBe('33%');
    });

    it('a slider never moves the pick on its change either; the hue survives a grey', async () => {
      const { fixture, slider, area, open } = setup({ value: '#336699', adjust });
      await open();
      const picker = fixture.componentInstance;
      const hue = slider('Hue');
      hue.value = '120';
      hue.dispatchEvent(new Event('input'));
      const saturation = slider('Saturation');
      saturation.value = '0';
      saturation.dispatchEvent(new Event('input'));
      saturation.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(picker.value()).toMatch(/^#([0-9a-f]{2})\1\1$/);
      expect(slider('Hue').value).toBe('120');
      const brightness = slider('Brightness');
      brightness.value = '100';
      brightness.dispatchEvent(new Event('input'));
      brightness.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      // White is not accepted by `adjust`, and it stays white: no jump to a grey.
      expect(picker.value()).toBe('#ffffff');
      expect(slider('Hue').value).toBe('120');
      expect(area().style.getPropertyValue('--ui-cp-x')).toBe('0%');
    });

    it('typing a hex moves the handles; "Add color" waits until it is accepted', async () => {
      const { fixture, hex, area, action, open, committed } = setup({ adjust });
      await open();
      const picker = fixture.componentInstance;
      type(hex(), '#ffffff');
      fixture.detectChanges();
      expect(picker.value()).toBe('#ffffff');
      expect(area().style.getPropertyValue('--ui-cp-y')).toBe('0%');
      expect(action('Add color').disabled).toBe(true);
      action('Add color').click();
      expect(committed).toEqual([]);

      type(hex(), '#336699');
      fixture.detectChanges();
      expect(area().style.getPropertyValue('--ui-cp-x')).toBe('67%');
      expect(action('Add color').disabled).toBe(false);
      action('Add color').click();
      expect(committed).toEqual(['#336699']);
    });

    it('Cancel puts back the colour of the opening', async () => {
      const { fixture, slider, action, open } = setup({ value: '#808080', adjust });
      await open();
      const brightness = slider('Brightness');
      brightness.value = '0';
      brightness.dispatchEvent(new Event('input'));
      brightness.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      action('Cancel').click();
      expect(fixture.componentInstance.value()).toBe('#808080');
    });
  });

  it('centres the swatch on taller neighbours through --ui-color-picker-align-height (#415)', () => {
    const css = compileScss('lib/components/color-picker/color-picker.component.scss');
    const base = withoutMedia(css, /./);
    const swatch = /\.ui-color-picker__swatch\s*\{([^}]*)\}/.exec(base)?.[1] ?? '';
    expect(swatch).toMatch(/--ui-color-picker-size:\s*2\.25rem/);
    expect(swatch).toMatch(
      /--ui-color-picker-offset:\s*calc\(\s*var\(--ui-color-picker-align-height, var\(--ui-color-picker-size\)\) - var\(--ui-color-picker-size\)\s*\)/,
    );
    expect(swatch).toMatch(/margin-block-start:\s*calc\(var\(--ui-color-picker-offset\) \/ 2\)/);
    expect(swatch).toMatch(/inline-size:\s*var\(--ui-color-picker-size\)/);
    expect(swatch).toMatch(/block-size:\s*var\(--ui-color-picker-size\)/);
    // 44px on coarse pointers: the same variable, so the offset follows.
    expect(mediaBlocks(css, /pointer:\s*coarse/).join('\n')).toMatch(
      /\.ui-color-picker__swatch\s*\{\s*--ui-color-picker-size:\s*2\.75rem/,
    );
    // The open panel takes a line of its own in a flex or a grid row.
    expect(base).toMatch(/\.ui-color-picker__disclose\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
  });

  it('a typed hex previews at once (with or without #, in lower case); Enter and blur only tidy it', async () => {
    const { fixture, hex, action, open, committed } = setup();
    await open();
    type(hex(), 'C0FFEE');
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('#c0ffee');
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    hex().dispatchEvent(enter);
    fixture.detectChanges();
    // Enter never submits a surrounding form and chooses nothing.
    expect(enter.defaultPrevented).toBe(true);
    expect(committed).toEqual([]);
    expect(hex().value).toBe('#c0ffee');

    type(hex(), '#123abc');
    hex().dispatchEvent(new Event('blur'));
    expect(committed).toEqual([]);
    action('Add color').click();
    expect(committed).toEqual(['#123abc']);
  });

  it('flags text that is not a colour and cannot be added', async () => {
    const { fixture, host, hex, action, open, committed } = setup();
    await open();
    type(hex(), '#12');
    fixture.detectChanges();
    hex().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(committed).toEqual([]);
    expect(action('Add color').disabled).toBe(true);
    expect(hex().getAttribute('aria-invalid')).toBe('true');
    const error = host.querySelector('.ui-color-picker__error');
    expect(error?.textContent).toContain('Enter a color like #2e6a99');
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

  it('clear() empties the value and the field, and the swatch is the wheel again', async () => {
    const { fixture, host, hex, open } = setup({ value: '#2e6a99' });
    await open();
    expect(host.querySelector('.ui-color-picker__plus')).toBeNull();
    fixture.componentInstance.clear();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('');
    expect(hex().value).toBe('');
    expect(host.querySelector('.ui-color-picker__plus')).not.toBeNull();
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
