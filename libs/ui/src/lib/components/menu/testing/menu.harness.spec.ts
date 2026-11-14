import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { afterEach, describe, expect, it } from 'vitest';
import { ButtonComponent } from '../../button/button.component';
import { UiButtonHarness } from '../../button/testing/button.harness';
import { MenuTriggerDirective } from '../../../directives/menu-trigger/menu-trigger.directive';
import { MenuItemComponent } from '../menu-item/menu-item.component';
import { MenuSeparatorComponent } from '../menu-separator/menu-separator.component';
import { MenuComponent } from '../menu.component';
import { UiMenuHarness } from './menu.harness';
import { UiMenuItemHarness } from './menu-item.harness';

@Component({
  imports: [
    ButtonComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-button [uiMenuTrigger]="menu">More</ui-button>
    <ui-menu #menu ariaLabel="Link actions">
      <ui-menu-item icon="external" shortcut="↵" (activated)="log('open')">Open</ui-menu-item>
      <ui-menu-item icon="star" [disabled]="true" (activated)="log('star')">Favorite</ui-menu-item>
      <ui-menu-item type="radio" [selected]="true" (activated)="log('grid')">Grid</ui-menu-item>
      <ui-menu-separator />
      <ui-menu-item icon="trash" danger (activated)="log('delete')">Delete</ui-menu-item>
    </ui-menu>
    <ui-menu ariaLabel="Orphan">
      <ui-menu-item>Nothing</ui-menu-item>
    </ui-menu>
  `,
})
class HostComponent {
  readonly activations = signal<string[]>([]);

  log(action: string): void {
    this.activations.update((list) => [...list, action]);
  }
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  const menu = await loader.getHarness(UiMenuHarness.with({ label: 'Link actions' }));
  return { fixture, loader, menu, host: fixture.componentInstance };
}

describe('UiMenuHarness', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
  });

  it('finds menus by label and opens one through its trigger', async () => {
    const { loader, menu } = await setup();
    expect(await loader.getAllHarnesses(UiMenuHarness)).toHaveLength(2);
    expect(await menu.getLabel()).toBe('Link actions');
    expect(await menu.isOpen()).toBe(false);
    expect(await menu.getItems()).toHaveLength(0);
    await menu.open();
    expect(await menu.isOpen()).toBe(true);
    await menu.open();
    expect(await menu.isOpen()).toBe(true);
    const trigger = await loader.getHarness(UiButtonHarness.with({ text: 'More' }));
    expect(await trigger.isExpanded()).toBe(true);
    expect(await menu.getFocusedItemText()).toBe('Open');
  });

  it('fails to open a menu without a trigger', async () => {
    const { loader } = await setup();
    const orphan = await loader.getHarness(UiMenuHarness.with({ label: 'Orphan' }));
    await expect(orphan.open()).rejects.toThrow();
  });

  it('reads the items and their state', async () => {
    const { menu } = await setup();
    await menu.open();
    const items = await menu.getItems();
    expect(await Promise.all(items.map((item) => item.getText()))).toEqual([
      'Open',
      'Favorite',
      'Grid',
      'Delete',
    ]);
    const [open, favorite, grid, remove] = items;
    expect(await open?.getShortcut()).toBe('↵');
    expect(await favorite?.getShortcut()).toBeNull();
    expect(await favorite?.isDisabled()).toBe(true);
    expect(await open?.getRole()).toBe('menuitem');
    expect(await open?.getChecked()).toBeNull();
    expect(await grid?.getRole()).toBe('menuitemradio');
    expect(await grid?.getChecked()).toBe(true);
    expect(await grid?.isSelected()).toBe(true);
    expect(await remove?.isDanger()).toBe(true);
    expect(await open?.isDanger()).toBe(false);
    expect(await menu.getItems({ disabled: false })).toHaveLength(3);
    await open?.hover();
  });

  it('clicks an item by text, which activates it and closes the menu', async () => {
    const { menu, host } = await setup();
    await menu.clickItem({ text: 'Delete' });
    expect(host.activations()).toEqual(['delete']);
    expect(await menu.isOpen()).toBe(false);
  });

  it('never activates a disabled item', async () => {
    const { menu, host } = await setup();
    await menu.clickItem({ text: 'Favorite' });
    expect(host.activations()).toEqual([]);
  });

  it('moves with the keyboard, activates with Enter and closes with Esc', async () => {
    const { menu, host, loader } = await setup();
    await menu.open();
    await menu.sendKeys(TestKey.END);
    expect(await menu.getFocusedItemText()).toBe('Delete');
    await menu.sendKeys(TestKey.HOME, TestKey.DOWN_ARROW);
    expect(await menu.getFocusedItemText()).toBe('Favorite');
    await menu.close();
    expect(await menu.isOpen()).toBe(false);
    expect(await menu.getFocusedItemText()).toBeNull();
    const trigger = await loader.getHarness(UiButtonHarness.with({ text: 'More' }));
    expect(await trigger.isFocused()).toBe(true);
    await menu.close();
    await menu.open();
    await menu.sendKeys(TestKey.ENTER);
    expect(host.activations()).toEqual(['open']);
  });

  it('finds an item harness on its own', async () => {
    const { menu, loader } = await setup();
    await menu.open();
    const item = await loader.getHarness(UiMenuItemHarness.with({ text: /^Gr/ }));
    expect(await item.getText()).toBe('Grid');
  });
});
