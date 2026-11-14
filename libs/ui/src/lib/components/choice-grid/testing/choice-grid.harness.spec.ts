import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { describe, expect, it } from 'vitest';
import { ChoiceGridComponent } from '../choice-grid.component';
import { CHOICE_GRID_KIND } from '../models/choice-grid-kind.const';
import type { ChoiceOption } from '../models/choice-option.interface';
import { UiChoiceGridHarness } from './choice-grid.harness';
import { UiChoiceHarness } from './choice.harness';

const COLOURS: readonly ChoiceOption[] = [
  { value: 'graphite', label: 'Graphite', colour: 'graphite' },
  { value: 'sage', label: 'Sage', colour: 'sage' },
  {
    value: '#a33a5b',
    label: 'Own colour #a33a5b',
    colour: '#a33a5b',
    removeLabel: 'Remove colour',
  },
];

const ICONS: readonly ChoiceOption[] = [
  { value: 'folder', label: 'Folder', icon: 'folder' },
  { value: 'star', label: 'Star', icon: 'star' },
];

@Component({
  imports: [ChoiceGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-choice-grid
      ariaLabel="Colour"
      [options]="colours"
      [(value)]="colour"
      (removed)="removed.update((list) => [...list, $event])"
    />
    <ui-choice-grid ariaLabel="Icon" kind="icon" [options]="icons" value="none" disabled />
  `,
})
class HostComponent {
  readonly colours = COLOURS;
  readonly icons = ICONS;
  readonly colour = signal('sage');
  readonly removed = signal<string[]>([]);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const grid = await loader.getHarness(UiChoiceGridHarness.with({ label: 'Colour' }));
  return { fixture, loader, grid, host: fixture.componentInstance };
}

describe('UiChoiceGridHarness', () => {
  it('finds grids by label and reads kind, state and options', async () => {
    const { loader, grid } = await setup();
    expect(await loader.getAllHarnesses(UiChoiceGridHarness)).toHaveLength(2);
    expect(await grid.getKind()).toBe(CHOICE_GRID_KIND.Swatch);
    expect(await grid.isDisabled()).toBe(false);
    expect(await grid.getLabels()).toEqual(['Graphite', 'Sage', 'Own colour #a33a5b']);
    expect(await (await grid.getSelected())?.getValue()).toBe('sage');
    const icons = await loader.getHarness(UiChoiceGridHarness.with({ label: 'Icon' }));
    expect(await icons.getKind()).toBe(CHOICE_GRID_KIND.Icon);
    expect(await icons.isDisabled()).toBe(true);
    expect(await icons.getSelected()).toBeNull();
    const [folder] = await icons.getChoices();
    expect(await folder?.isDisabled()).toBe(true);
  });

  it('selects by label or value', async () => {
    const { grid, host } = await setup();
    await grid.select({ label: 'Graphite' });
    expect(host.colour()).toBe('graphite');
    await grid.select({ value: '#a33a5b' });
    expect(host.colour()).toBe('#a33a5b');
    const [checked] = await grid.getChoices({ checked: true });
    expect(await checked?.getLabel()).toBe('Own colour #a33a5b');
  });

  it('removes an own option by pointer and by keyboard', async () => {
    const { grid, host, loader } = await setup();
    const own = await loader.getHarness(UiChoiceHarness.with({ label: /^Own/ }));
    expect(await own.isRemovable()).toBe(true);
    expect(await own.getRemoveLabel()).toBe('Remove colour');
    await own.remove();
    await own.select();
    await own.removeWithKeyboard();
    expect(host.removed()).toEqual(['#a33a5b', '#a33a5b']);
    const [graphite] = await grid.getChoices({ label: 'Graphite' });
    expect(await graphite?.isRemovable()).toBe(false);
    expect(await graphite?.getRemoveLabel()).toBeNull();
    await expect(graphite?.remove()).rejects.toThrow(/cannot be removed/);
    await graphite?.sendKeys(' ');
  });
});
