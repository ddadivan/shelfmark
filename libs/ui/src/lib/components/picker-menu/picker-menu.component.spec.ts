import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import type { PickerOption } from '../picker-list/models/picker-option.interface';
import { PickerMenuComponent } from './picker-menu.component';
import { UiPickerMenuHarness } from './testing/picker-menu.harness';

const TREE: PickerOption[] = [
  {
    id: 'work',
    name: 'Work',
    colour: FOLDER_COLOUR.Ocean,
    children: [{ id: 'angular', name: 'Angular', icon: 'star' }],
  },
  { id: 'clothes', name: 'Clothes', colour: FOLDER_COLOUR.Rose },
];

@Component({
  imports: [PickerMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" id="before">Before</button>
    <ui-picker-menu
      [options]="options"
      [value]="value()"
      [label]="label()"
      icon="star"
      colour="plum"
      emptyLabel="Unsorted"
      [currentIds]="['angular']"
      currentLabel="On the left"
      searchLabel="Find a folder"
      listLabel="Show on the right"
      noResultsLabel="No folders found"
      triggerLabel="Right folder: Clothes. Change"
      (chosen)="picked.push($event)"
    />
    <button type="button" id="after">After</button>
  `,
})
class HostComponent {
  readonly options = TREE;
  readonly value = signal<string | null>('clothes');
  readonly label = signal('Clothes');
  readonly picked: (string | null)[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 4; i++) {
    fixture.detectChanges();
    TestBed.tick();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('PickerMenuComponent', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    document.body.append(fixture.nativeElement as HTMLElement);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const menu = await loader.getHarness(UiPickerMenuHarness);
    const trigger = root.querySelector<HTMLButtonElement>(
      '.ui-picker-menu__trigger',
    ) as HTMLElement;
    const panel = () => document.querySelector<HTMLElement>('[role="dialog"]');
    return { fixture, root, menu, trigger, panel, host: fixture.componentInstance };
  }

  it('shows the folder tile, the name and a chevron on a dialog-popup button', async () => {
    const { menu, trigger } = await setup();
    expect(await menu.getTriggerLabel()).toBe('Clothes');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-label')).toBe('Right folder: Clothes. Change');
    expect(trigger.getAttribute('aria-controls')).toBeNull();
    expect(trigger.querySelector('ui-folder-icon')?.classList).toContain('ui-folder-icon--plum');
    expect(trigger.querySelector('ui-icon')).not.toBeNull();
  });

  it('has no aria-label without a trigger label, so the visible name is the name', async () => {
    const fixture = TestBed.createComponent(PickerMenuComponent);
    fixture.componentRef.setInput('label', 'Clothes');
    fixture.componentRef.setInput('searchLabel', 'Find');
    fixture.componentRef.setInput('listLabel', 'Folders');
    await settle(fixture);
    const trigger = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(trigger?.hasAttribute('aria-label')).toBe(false);
    expect(trigger?.textContent).toContain('Clothes');
  });

  it('opens a named dialog under the trigger, focusing the search box', async () => {
    const { menu, trigger, panel, fixture } = await setup();
    await menu.open();
    await settle(fixture);
    expect(await menu.isOpen()).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel()?.getAttribute('aria-label')).toBe('Show on the right');
    expect(trigger.getAttribute('aria-controls')).toBe(panel()?.id);
    expect(panel()?.closest('.cdk-overlay-container')).not.toBeNull();
    expect(document.activeElement).toBe(panel()?.querySelector('input'));
    expect(await menu.getOptionNames()).toEqual(['Unsorted', 'Work', 'Angular', 'Clothes']);
  });

  it('checks the shown value and disables the current rows', async () => {
    const { menu, panel, fixture } = await setup();
    await menu.open();
    await settle(fixture);
    const selected = panel()?.querySelectorAll('[role="option"][aria-selected="true"]');
    expect(selected).toHaveLength(1);
    expect(selected?.[0]?.textContent).toContain('Clothes');
    expect(await menu.isOptionDisabled('Angular')).toBe(true);
    expect(await menu.isOptionDisabled('Work')).toBe(false);
    expect(panel()?.textContent).toContain('On the left');
  });

  it('emits chosen, closes and returns focus to the trigger', async () => {
    const { menu, trigger, fixture, host } = await setup();
    await menu.choose('Work');
    await settle(fixture);
    expect(host.picked).toEqual(['work']);
    expect(await menu.isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('emits null for the empty row', async () => {
    const { menu, fixture, host } = await setup();
    await menu.choose('Unsorted');
    await settle(fixture);
    expect(host.picked).toEqual([null]);
  });

  it('closes without emitting when the shown value is chosen again', async () => {
    const { menu, fixture, host } = await setup();
    await menu.choose('Clothes');
    await settle(fixture);
    expect(host.picked).toEqual([]);
    expect(await menu.isOpen()).toBe(false);
  });

  it('ignores the disabled current row', async () => {
    const { menu, fixture, host } = await setup();
    await menu.choose('Angular');
    await settle(fixture);
    expect(host.picked).toEqual([]);
    expect(await menu.isOpen()).toBe(true);
  });

  it('filters through the search box', async () => {
    const { menu, fixture } = await setup();
    await menu.search('clo');
    await settle(fixture);
    expect(await menu.getOptionNames()).toEqual(['Clothes']);
    await menu.search('zzz');
    await settle(fixture);
    expect(await menu.isOpen()).toBe(true);
    expect(await menu.getOptionNames()).toEqual([]);
    expect(document.querySelector('[role="dialog"] [role="status"]')?.textContent).toContain(
      'No folders found',
    );
  });

  it('closes with Esc, returns focus and keeps Esc from the surroundings', async () => {
    const { menu, trigger, fixture, root } = await setup();
    const outer = vi.fn();
    root.addEventListener('keydown', outer);
    await menu.open();
    await settle(fixture);
    await menu.close();
    await settle(fixture);
    expect(await menu.isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(outer).not.toHaveBeenCalled();
  });

  it('closes on a press outside without moving focus', async () => {
    const { menu, fixture } = await setup();
    await menu.open();
    await settle(fixture);
    const after = document.getElementById('after') as HTMLElement;
    after.focus();
    after.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await settle(fixture);
    expect(await menu.isOpen()).toBe(false);
    expect(document.activeElement).toBe(after);
  });

  it('closes when focus leaves the popover', async () => {
    const { menu, fixture } = await setup();
    await menu.open();
    await settle(fixture);
    (document.getElementById('after') as HTMLElement).focus();
    await settle(fixture);
    expect(await menu.isOpen()).toBe(false);
  });

  it('does not close on a press inside the popover and toggles with the trigger', async () => {
    const { menu, trigger, panel, fixture } = await setup();
    await menu.open();
    await settle(fixture);
    panel()?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await settle(fixture);
    expect(await menu.isOpen()).toBe(true);
    trigger.click();
    await settle(fixture);
    expect(await menu.isOpen()).toBe(false);
  });

  it('can be reopened and shows the new value', async () => {
    const { menu, fixture, host } = await setup();
    await menu.choose('Work');
    await settle(fixture);
    host.value.set('work');
    host.label.set('Work');
    await settle(fixture);
    expect(await menu.getTriggerLabel()).toBe('Work');
    await menu.open();
    await settle(fixture);
    expect(await menu.isOpen()).toBe(true);
    expect(document.querySelector('[role="option"][aria-selected="true"]')?.textContent).toContain(
      'Work',
    );
  });

  it('ignores other keys on the popover', async () => {
    const { menu, panel, fixture } = await setup();
    await menu.open();
    await settle(fixture);
    panel()?.dispatchEvent(
      new KeyboardEvent('keydown', { key: KEYBOARD_KEY.Enter, bubbles: true }),
    );
    await settle(fixture);
    expect(await menu.isOpen()).toBe(true);
  });

  it('is axe clean, closed and open', async () => {
    const { menu, fixture, root } = await setup();
    expect(await axeViolations(root)).toEqual([]);
    await menu.open();
    await settle(fixture);
    expect(await axeViolations(document.body)).toEqual([]);
  });
});
