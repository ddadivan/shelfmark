import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { PickerMenuComponent } from '../picker-menu.component';
import { UiPickerMenuHarness } from './picker-menu.harness';

@Component({
  imports: [PickerMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-picker-menu
      label="Left"
      [options]="options"
      value="a"
      searchLabel="Find"
      listLabel="Left folders"
      (chosen)="chosen = $event"
    />
    <ui-picker-menu label="Right" [options]="options" searchLabel="Find" listLabel="Right" />
  `,
})
class HostComponent {
  readonly options = [
    { id: 'a', name: 'Alpha' },
    { id: 'b', name: 'Beta' },
  ];
  chosen: string | null = null;
}

describe('UiPickerMenuHarness', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.replaceChildren());
  });

  it('filters by label, opens, lists, searches, chooses and closes', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    expect(await loader.getAllHarnesses(UiPickerMenuHarness)).toHaveLength(2);
    const menu = await loader.getHarness(UiPickerMenuHarness.with({ label: 'Left' }));
    expect(await menu.getTriggerLabel()).toBe('Left');
    expect(await menu.isOpen()).toBe(false);
    expect(await menu.getOptionNames()).toEqual([]);
    await menu.open();
    expect(await menu.isOpen()).toBe(true);
    expect(await menu.getOptionNames()).toEqual(['Alpha', 'Beta']);
    expect(await menu.isOptionDisabled('Alpha')).toBe(false);
    await menu.search('bet');
    expect(await menu.getOptionNames()).toEqual(['Beta']);
    await menu.close();
    expect(await menu.isOpen()).toBe(false);
    await menu.choose('Beta');
    expect(fixture.componentInstance.chosen).toBe('b');
    expect(await menu.isOpen()).toBe(false);
  });

  it('throws for an option that is not there or a closed popover', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(UiPickerMenuHarness);
    await menu.open();
    await expect(menu.isOptionDisabled('Nope')).rejects.toThrow('no option named');
    await menu.close();
    await expect(menu.isOptionDisabled('Alpha')).rejects.toThrow('closed');
  });
});
