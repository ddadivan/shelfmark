import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { describe, expect, it } from 'vitest';
import type { UiTreeContextMenuEvent } from '../models/tree-context-menu-event.interface';
import { UI_TREE_CONTEXT_MENU_TRIGGER } from '../models/tree-context-menu-trigger.const';
import type { UiTreeNode } from '../models/tree-node.interface';
import type { UiTreeToggleEvent } from '../models/tree-toggle-event.interface';
import { TREE_STORY_FIXED } from '../stories/tree-story-fixed.const';
import { TREE_STORY_ID } from '../stories/tree-story-id.const';
import { TREE_STORY_NAME } from '../stories/tree-story-name.const';
import { TREE_STORY_NESTED } from '../stories/tree-story-nested.const';
import { TreeComponent } from '../tree.component';
import { UiTreeHarness } from './tree.harness';

@Component({
  imports: [TreeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-tree
      ariaLabel="Library"
      heading="Folders"
      [fixedNodes]="fixed"
      [nodes]="nodes"
      [activeId]="activeId()"
      menuLabel="Actions for {name}"
      [menuNodeId]="menuNodeId()"
      [dropTargetId]="dropTargetId()"
      [noDropIds]="noDropIds()"
      dropLabel="Move here"
      (selected)="selected.update((list) => [...list, $event])"
      (toggled)="toggled.update((list) => [...list, $event])"
      (contextMenu)="menus.update((list) => [...list, $event])"
    />
    <ui-tree ariaLabel="Empty" />
  `,
})
class HostComponent {
  readonly fixed = TREE_STORY_FIXED;
  readonly nodes = TREE_STORY_NESTED;
  readonly activeId = signal<string | null>(TREE_STORY_ID.Angular);
  readonly menuNodeId = signal<string | null>(null);
  readonly dropTargetId = signal<string | null>(null);
  readonly noDropIds = signal<readonly string[]>([]);
  readonly selected = signal<UiTreeNode[]>([]);
  readonly toggled = signal<UiTreeToggleEvent[]>([]);
  readonly menus = signal<UiTreeContextMenuEvent[]>([]);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  document.body.appendChild(fixture.nativeElement);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const tree = await loader.getHarness(UiTreeHarness.with({ label: 'Library' }));
  return { fixture, loader, tree, host: fixture.componentInstance };
}

describe('UiTreeHarness', () => {
  it('finds trees by label and reads heading and rows', async () => {
    const { loader, tree } = await setup();
    expect(await loader.getAllHarnesses(UiTreeHarness)).toHaveLength(2);
    const empty = await loader.getHarness(UiTreeHarness.with({ label: 'Empty' }));
    expect(await empty.getHeading()).toBeNull();
    expect(await empty.getItems()).toEqual([]);
    expect(await empty.getCurrentItem()).toBeNull();
    expect(await tree.getHeading()).toBe('Folders');
    expect(await tree.getItemNames({ folder: false })).toEqual([
      TREE_STORY_NAME.All,
      TREE_STORY_NAME.Unsorted,
      TREE_STORY_NAME.Favorites,
    ]);
    expect(await tree.getItemNames({ level: 2 })).toEqual([
      TREE_STORY_NAME.Angular,
      TREE_STORY_NAME.Courses,
    ]);
    expect(await tree.getItemNames({ expanded: true })).toEqual([TREE_STORY_NAME.Work]);
    expect(await (await tree.getCurrentItem())?.getName()).toBe(TREE_STORY_NAME.Angular);
  });

  it('reads the state of a row', async () => {
    const { tree, host } = await setup();
    const work = await tree.getItem({ name: TREE_STORY_NAME.Work });
    expect(await work.getCount()).toBe(34);
    expect(await work.getLevel()).toBe(1);
    expect(await work.isFolder()).toBe(true);
    expect(await work.isExpandable()).toBe(true);
    expect(await work.isExpanded()).toBe(true);
    expect(await work.isCurrent()).toBe(false);
    expect(await work.isDisabled()).toBe(false);
    expect(await work.hasMenuButton()).toBe(true);
    expect(await work.getMenuButtonLabel()).toBe('Actions for Work');
    expect(await work.isMenuOpen()).toBe(false);
    expect(await work.getDropLabel()).toBeNull();
    const recipes = await tree.getItem({ name: TREE_STORY_NAME.Recipes });
    expect(await recipes.isExpandable()).toBe(false);
    const all = await tree.getItem({ name: TREE_STORY_NAME.All });
    expect(await all.hasMenuButton()).toBe(false);
    expect(await all.getMenuButtonLabel()).toBeNull();
    host.menuNodeId.set(TREE_STORY_ID.Work);
    host.dropTargetId.set(TREE_STORY_ID.Recipes);
    host.noDropIds.set([TREE_STORY_ID.Clothes]);
    expect(await work.isMenuOpen()).toBe(true);
    expect(await recipes.getDropLabel()).toBe('Move here');
    expect(await recipes.getCount()).toBeNull();
    expect(await (await tree.getItem({ name: TREE_STORY_NAME.Clothes })).isDisabled()).toBe(true);
  });

  it('chooses, expands and collapses rows', async () => {
    const { tree, host } = await setup();
    await (await tree.getItem({ name: TREE_STORY_NAME.Recipes })).select();
    expect(host.selected().map((node) => node.id)).toEqual([TREE_STORY_ID.Recipes]);
    const clothes = await tree.getItem({ name: TREE_STORY_NAME.Clothes });
    expect(await tree.getItemNames({ level: 2 })).toHaveLength(2);
    await clothes.expand();
    expect(await clothes.isExpanded()).toBe(true);
    expect(await tree.getItemNames({ level: 2 })).toEqual([
      TREE_STORY_NAME.Angular,
      TREE_STORY_NAME.Courses,
      TREE_STORY_NAME.Shoes,
      'Coats',
    ]);
    await clothes.expand();
    await clothes.collapse();
    expect(await clothes.isExpanded()).toBe(false);
    await clothes.collapse();
    expect(host.toggled().map((event) => event.expanded)).toEqual([true, false]);
    expect(host.selected()).toHaveLength(1);
    const recipes = await tree.getItem({ name: TREE_STORY_NAME.Recipes });
    await expect(recipes.toggle()).rejects.toThrow(/no children/);
    const all = await tree.getItem({ name: TREE_STORY_NAME.All });
    await expect(all.toggle()).rejects.toThrow(/no children/);
    await expect(all.openMenu()).rejects.toThrow(/no menu button/);
  });

  it('asks for the folder menu from the button, a right click and the keyboard', async () => {
    const { tree, host } = await setup();
    const work = await tree.getItem({ name: TREE_STORY_NAME.Work });
    await work.openMenu();
    await work.rightClick();
    await work.focus();
    expect(await work.isFocused()).toBe(true);
    await work.sendKeysWith({ shift: true }, TestKey.F10);
    await work.sendKeysWith({ alt: true }, TestKey.ENTER);
    expect(host.menus().map((event) => event.trigger)).toEqual([
      UI_TREE_CONTEXT_MENU_TRIGGER.Button,
      UI_TREE_CONTEXT_MENU_TRIGGER.Pointer,
      UI_TREE_CONTEXT_MENU_TRIGGER.Keyboard,
      UI_TREE_CONTEXT_MENU_TRIGGER.Keyboard,
    ]);
    expect(host.menus().every((event) => event.node.id === TREE_STORY_ID.Work)).toBe(true);
  });
});
