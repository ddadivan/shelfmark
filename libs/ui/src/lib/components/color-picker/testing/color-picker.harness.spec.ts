import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { describe, expect, it } from 'vitest';
import { ColorPickerComponent } from '../color-picker.component';
import { UiColorPickerHarness } from './color-picker.harness';

@Component({
  imports: [ColorPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-color-picker
      label="Your own color"
      pickerLabel="Color"
      saturationLabel="Saturation"
      brightnessLabel="Brightness"
      hueLabel="Hue"
      hexLabel="Hex code"
      invalidMessage="Enter a color like #2e6a99"
      addLabel="Add color"
      cancelLabel="Cancel"
      [selected]="selected()"
      [(value)]="value"
      (committed)="committed.update((list) => [...list, $event])"
    />
    <ui-color-picker
      label="Locked"
      pickerLabel="Color"
      saturationLabel="Saturation"
      brightnessLabel="Brightness"
      hueLabel="Hue"
      hexLabel="Hex code"
      invalidMessage="Bad"
      addLabel="Add"
      cancelLabel="Cancel"
      disabled
    />
  `,
})
class HostComponent {
  readonly value = signal('');
  readonly selected = signal(false);
  readonly committed = signal<string[]>([]);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const picker = await loader.getHarness(UiColorPickerHarness.with({ label: 'Your own color' }));
  return { fixture, loader, picker, host: fixture.componentInstance };
}

describe('UiColorPickerHarness', () => {
  it('finds pickers by label and opens and closes the panel', async () => {
    const { loader, picker, host } = await setup();
    expect(await loader.getAllHarnesses(UiColorPickerHarness)).toHaveLength(2);
    const locked = await loader.getHarness(UiColorPickerHarness.with({ label: 'Locked' }));
    expect(await locked.isDisabled()).toBe(true);
    expect(await picker.isDisabled()).toBe(false);
    expect(await picker.hasColour()).toBe(false);
    expect(await picker.isSelected()).toBe(false);
    host.selected.set(true);
    expect(await picker.isSelected()).toBe(true);
    expect(await picker.isOpen()).toBe(false);
    await expect(picker.getHex()).rejects.toThrow(/panel is closed/);
    await picker.open();
    expect(await picker.isOpen()).toBe(true);
    await picker.open();
    await picker.cancel();
    expect(await picker.isOpen()).toBe(false);
    await picker.toggle();
    await picker.pressEscape();
    expect(await picker.isOpen()).toBe(false);
    expect(host.committed()).toEqual([]);
  });

  it('types a hex code, flags an invalid one and adds the colour', async () => {
    const { picker, host } = await setup();
    await picker.open();
    await picker.setHex('#12');
    await picker.confirmHex();
    expect(await picker.isHexInvalid()).toBe(true);
    expect(await picker.getError()).toBe('Enter a color like #2e6a99');
    expect(await picker.canAdd()).toBe(false);
    await picker.setHex('#a33a5b');
    expect(await picker.isHexInvalid()).toBe(false);
    expect(await picker.getError()).toBeNull();
    expect(await picker.getHex()).toBe('#a33a5b');
    expect(await picker.canAdd()).toBe(true);
    await picker.add();
    expect(host.committed()).toEqual(['#a33a5b']);
    expect(host.value()).toBe('#a33a5b');
    expect(await picker.isOpen()).toBe(true);
    expect(await picker.hasColour()).toBe(true);
  });

  it('moves the hue, saturation and brightness sliders', async () => {
    const { picker } = await setup();
    await picker.open();
    await picker.setHex('');
    await picker.setHue(120);
    expect(await picker.getHue()).toBe(120);
    await picker.setSaturation(100);
    await picker.setBrightness(100);
    expect(await picker.getHex()).toBe('#00ff00');
  });
});
