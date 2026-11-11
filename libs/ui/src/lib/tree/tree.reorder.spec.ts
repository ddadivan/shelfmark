import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { axeViolations } from '../../testing/axe';
import { KEYBOARD_KEY } from '../keyboard';
import { LONG_PRESS_DURATION_MS } from '../long-press/models/long-press.const';
import type { UiTreeContextMenuEvent } from './models/tree-context-menu-event.interface';
import type { UiTreeNode } from './models/tree-node.interface';
import { TREE_REORDER_TOUCH_DELAY_MS } from './models/tree-reorder-touch-delay.const';
import type { UiTreeReorderEvent } from './models/tree-reorder-event.interface';
import { UI_TREE_REORDER_TRIGGER } from './models/tree-reorder-trigger.const';
import { TREE_STORY_FIXED } from './stories/tree-story-fixed.const';
import { TREE_STORY_ID } from './stories/tree-story-id.const';
import { TREE_STORY_NAME } from './stories/tree-story-name.const';
import { TREE_STORY_NESTED } from './stories/tree-story-nested.const';
import { TreeComponent } from './tree.component';
import { TreeReorderListDirective } from './tree-reorder-list.directive';

@Component({
  imports: [TreeComponent],
  template: `
    <ui-tree
      ariaLabel="Library"
      heading="Folders"
      menuLabel="Actions for {name}"
      [fixedNodes]="fixed"
      [nodes]="nodes()"
      [reorderable]="reorderable()"
      (reordered)="reordered.push($event)"
      (reorderStarted)="started.push($event)"
      (contextMenu)="menus.push($event)"
    />
  `,
})
class ReorderHostComponent {
  readonly fixed = TREE_STORY_FIXED;
  readonly nodes = signal<readonly UiTreeNode[]>(TREE_STORY_NESTED);
  readonly reorderable = signal(true);
  readonly reordered: UiTreeReorderEvent[] = [];
  readonly started: UiTreeNode[] = [];
  readonly menus: UiTreeContextMenuEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    fixture.detectChanges();
    TestBed.tick();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function setup() {
  const fixture = TestBed.createComponent(ReorderHostComponent);
  document.body.appendChild(fixture.nativeElement);
  await settle(fixture);
  const root = fixture.nativeElement as HTMLElement;
  const host = fixture.componentInstance;
  const tree = fixture.debugElement.query(By.directive(TreeComponent))
    .componentInstance as TreeComponent;
  const row = (name: string): HTMLElement => {
    const found = Array.from(root.querySelectorAll<HTMLElement>('[role="treeitem"]')).find(
      (el) => el.querySelector('.ui-tree__name')?.textContent === name,
    );
    if (!found) {
      throw new Error(`No tree item named ${name}`);
    }
    return found;
  };
  /** Focuses the row (as the Aria tree's active row) and presses a key on it. */
  const press = async (name: string, key: string, init: KeyboardEventInit = {}) => {
    const target = row(name);
    const id = target.getAttribute('data-ui-tree-id') ?? '';
    tree.focusRow(id);
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    document.activeElement?.dispatchEvent(event);
    await settle(fixture);
    return event;
  };
  const focusedName = () =>
    document.activeElement?.querySelector('.ui-tree__name')?.textContent ?? null;
  return { fixture, root, host, tree, row, press, focusedName };
}

describe('TreeComponent reorder', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('Alt+ArrowDown on a top-level folder asks for the next place and keeps focus', async () => {
    const { host, press, focusedName } = await setup();
    const event = await press(TREE_STORY_NAME.Work, KEYBOARD_KEY.ArrowDown, { altKey: true });
    expect(event.defaultPrevented).toBe(true);
    expect(host.reordered).toHaveLength(1);
    expect(host.reordered[0]).toMatchObject({
      parentId: null,
      fromIndex: 0,
      toIndex: 1,
      total: 3,
      trigger: UI_TREE_REORDER_TRIGGER.Keyboard,
    });
    expect(host.reordered[0].node.id).toBe(TREE_STORY_ID.Work);
    // Aria did not read it as a plain ArrowDown (that would focus Angular, the first child).
    expect(focusedName()).toBe(TREE_STORY_NAME.Work);
  });

  it('Alt+ArrowUp on a subfolder counts among its siblings only', async () => {
    const { host, press } = await setup();
    await press(TREE_STORY_NAME.Courses, KEYBOARD_KEY.ArrowUp, { altKey: true });
    expect(host.reordered).toHaveLength(1);
    expect(host.reordered[0]).toMatchObject({
      parentId: TREE_STORY_ID.Work,
      fromIndex: 1,
      toIndex: 0,
      total: 2,
    });
  });

  it('asks for nothing past the ends and still keeps Aria from moving focus', async () => {
    const { host, press, focusedName } = await setup();
    await press(TREE_STORY_NAME.Work, KEYBOARD_KEY.ArrowUp, { altKey: true });
    expect(focusedName()).toBe(TREE_STORY_NAME.Work);
    await press(TREE_STORY_NAME.Recipes, KEYBOARD_KEY.ArrowDown, { altKey: true });
    expect(focusedName()).toBe(TREE_STORY_NAME.Recipes);
    expect(host.reordered).toEqual([]);
  });

  it('ignores fixed rows, other modifiers and a tree that is not reorderable', async () => {
    const { host, fixture, press, focusedName } = await setup();
    await press(TREE_STORY_NAME.All, KEYBOARD_KEY.ArrowDown, { altKey: true });
    await press(TREE_STORY_NAME.Work, KEYBOARD_KEY.ArrowDown, { altKey: true, shiftKey: true });
    await press(TREE_STORY_NAME.Work, KEYBOARD_KEY.ArrowDown, { altKey: true, ctrlKey: true });
    expect(host.reordered).toEqual([]);

    host.reorderable.set(false);
    await settle(fixture);
    await press(TREE_STORY_NAME.Clothes, KEYBOARD_KEY.ArrowDown, { altKey: true });
    expect(host.reordered).toEqual([]);
    // A plain ArrowDown still walks the tree.
    await press(TREE_STORY_NAME.Clothes, KEYBOARD_KEY.ArrowDown);
    expect(focusedName()).toBe(TREE_STORY_NAME.Recipes);
  });

  it('gives focus back to the moved row once the new order is drawn', async () => {
    const { host, fixture, press, focusedName } = await setup();
    await press(TREE_STORY_NAME.Clothes, KEYBOARD_KEY.ArrowUp, { altKey: true });
    const [work, clothes, recipes] = TREE_STORY_NESTED;
    host.nodes.set([clothes, work, recipes]);
    await settle(fixture);
    expect(focusedName()).toBe(TREE_STORY_NAME.Clothes);
    // The next Alt+Down starts from the new place.
    await press(TREE_STORY_NAME.Clothes, KEYBOARD_KEY.ArrowDown, { altKey: true });
    expect(host.reordered.at(-1)).toMatchObject({ fromIndex: 0, toIndex: 1 });
  });

  it('turns a drop in a sibling list into a pointer reorder of that parent', async () => {
    const { host, fixture } = await setup();
    const lists = fixture.debugElement
      .queryAll(By.directive(TreeReorderListDirective))
      .map((debug) => ({
        list: debug.injector.get(TreeReorderListDirective),
        element: debug.nativeElement as HTMLElement,
      }));
    const top = lists.find((entry) => entry.element.getAttribute('role') === 'tree');
    const work = lists.find(
      (entry) =>
        entry.element.getAttribute('role') === 'group' &&
        entry.element.querySelector(`[data-ui-tree-id="${TREE_STORY_ID.Courses}"]`),
    );
    top?.list.dropped.emit({ id: TREE_STORY_ID.Recipes, previousIndex: 2, currentIndex: 0 });
    work?.list.dropped.emit({ id: TREE_STORY_ID.Angular, previousIndex: 0, currentIndex: 0 });
    work?.list.dropped.emit({ id: TREE_STORY_ID.Angular, previousIndex: 0, currentIndex: 1 });
    expect(host.reordered).toHaveLength(2);
    expect(host.reordered[0]).toMatchObject({
      parentId: null,
      fromIndex: 2,
      toIndex: 0,
      total: 3,
      trigger: UI_TREE_REORDER_TRIGGER.Pointer,
    });
    expect(host.reordered[1]).toMatchObject({
      parentId: TREE_STORY_ID.Work,
      fromIndex: 0,
      toIndex: 1,
      total: 2,
    });
  });

  it('starts a touch drag after a short rest, before the long press opens the menu (#315)', async () => {
    const { row } = await setup();
    expect(TREE_REORDER_TOUCH_DELAY_MS).toBeGreaterThan(0);
    expect(TREE_REORDER_TOUCH_DELAY_MS).toBeLessThan(LONG_PRESS_DURATION_MS);
    // CDK makes a handle `touch-action: none`; a swipe on a row must still scroll the list.
    expect(row(TREE_STORY_NAME.Work).style.touchAction).toBe('pan-y');
    expect(row(TREE_STORY_NAME.Courses).style.touchAction).toBe('pan-y');
  });

  it('says when a row drag starts and opens no row menu until it is dropped', async () => {
    const { host, fixture, row } = await setup();
    const top = fixture.debugElement
      .queryAll(By.directive(TreeReorderListDirective))
      .map((debug) => debug.injector.get(TreeReorderListDirective))[0];
    const menuAt = () =>
      row(TREE_STORY_NAME.Clothes).dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 9, clientY: 9 }),
      );

    top.started.emit(TREE_STORY_ID.Clothes);
    expect(host.started.map((node) => node.id)).toEqual([TREE_STORY_ID.Clothes]);
    menuAt();
    expect(host.menus).toEqual([]);

    top.dropped.emit({ id: TREE_STORY_ID.Clothes, previousIndex: 1, currentIndex: 1 });
    menuAt();
    expect(host.menus).toHaveLength(1);
    expect(host.menus[0].node.id).toBe(TREE_STORY_ID.Clothes);
  });

  it('has no axe violations', async () => {
    const { root } = await setup();
    expect(await axeViolations(root)).toEqual([]);
  });
});
