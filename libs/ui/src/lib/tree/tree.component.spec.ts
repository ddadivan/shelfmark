import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import type { UiTreeContextMenuEvent } from './models/tree-context-menu-event.interface';
import type { UiTreeNode } from './models/tree-node.interface';
import type { UiTreeToggleEvent } from './models/tree-toggle-event.interface';
import { TreeComponent } from './tree.component';

const FIXED: UiTreeNode[] = [
  { id: 'all', name: 'All links', icon: 'link', count: 248 },
  { id: 'unsorted', name: 'Unsorted', icon: 'inbox', count: 17 },
];

const FOLDERS: UiTreeNode[] = [
  {
    id: 'work',
    name: 'Work',
    count: 34,
    expanded: true,
    children: [
      { id: 'angular', name: 'Angular', count: 12 },
      { id: 'courses', name: 'Courses', count: 8 },
    ],
  },
  { id: 'clothes', name: 'Clothes', count: 21, children: [{ id: 'shoes', name: 'Shoes' }] },
  { id: 'recipes', name: 'Recipes' },
];

@Component({
  imports: [TreeComponent],
  template: `
    <ui-tree
      ariaLabel="Library"
      heading="Folders"
      [fixedNodes]="fixed()"
      [nodes]="nodes()"
      [activeId]="activeId()"
      [menuLabel]="menuLabel()"
      [menuNodeId]="menuNodeId()"
      [countLabel]="countLabel()"
      (selected)="selected.push($event)"
      (toggled)="toggled.push($event)"
      (contextMenu)="menus.push($event)"
    />
  `,
})
class HostComponent {
  readonly fixed = signal(FIXED);
  readonly nodes = signal(FOLDERS);
  readonly activeId = signal<string | null>('angular');
  readonly menuLabel = signal<string | undefined>('Actions for {name}');
  readonly menuNodeId = signal<string | null>(null);
  readonly countLabel = signal<string | undefined>(undefined);
  readonly selected: UiTreeNode[] = [];
  readonly toggled: UiTreeToggleEvent[] = [];
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
  const fixture = TestBed.createComponent(HostComponent);
  document.body.appendChild(fixture.nativeElement);
  await settle(fixture);
  const root = fixture.nativeElement as HTMLElement;
  const host = fixture.componentInstance;
  const item = (id: string): HTMLElement => {
    const found = Array.from(root.querySelectorAll<HTMLElement>('[role="treeitem"]')).find(
      (el) => el.querySelector('.ui-tree__name')?.textContent === id,
    );
    if (!found) {
      throw new Error(`No tree item named ${id}`);
    }
    return found;
  };
  const row = (id: string): HTMLElement => item(id).querySelector('.ui-tree__row') as HTMLElement;
  const key = async (element: Element, name: string, init: KeyboardEventInit = {}) => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }),
    );
    await settle(fixture);
  };
  const click = async (element: Element) => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await settle(fixture);
  };
  const tree = root.querySelector('[role="tree"]') as HTMLElement;
  return { fixture, root, host, item, row, key, click, tree };
}

describe('TreeComponent', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  describe('structure and ARIA', () => {
    it('renders a labelled navigation tree with fixed rows, the heading and the folders', async () => {
      const { root, tree } = await setup();
      expect(tree.getAttribute('aria-label')).toBe('Library');
      expect(root.querySelector('.ui-tree__section')?.textContent).toBe('Folders');
      const names = Array.from(root.querySelectorAll('.ui-tree__name')).map((el) => el.textContent);
      expect(names.slice(0, 4)).toEqual(['All links', 'Unsorted', 'Work', 'Angular']);
    });

    it('sets aria-level, aria-expanded and aria-current', async () => {
      const { item } = await setup();
      expect(item('All links').getAttribute('aria-level')).toBe('1');
      expect(item('Work').getAttribute('aria-level')).toBe('1');
      expect(item('Angular').getAttribute('aria-level')).toBe('2');
      expect(item('Work').getAttribute('aria-expanded')).toBe('true');
      expect(item('Clothes').getAttribute('aria-expanded')).toBe('false');
      expect(item('Recipes').hasAttribute('aria-expanded')).toBe(false);
      expect(item('Angular').getAttribute('aria-current')).toBe('page');
      expect(item('Work').hasAttribute('aria-current')).toBe(false);
    });

    it('names a row by its name and count, not by its children', async () => {
      const { item, root, host, fixture } = await setup();
      const labelled = (id: string) =>
        (item(id).getAttribute('aria-labelledby') ?? '')
          .split(' ')
          .map((ref) => root.querySelector(`[id="${ref}"]`)?.textContent)
          .join(' ');
      expect(labelled('Work')).toBe('Work 34');
      host.countLabel.set('{count} links');
      await settle(fixture);
      expect(labelled('Work')).toBe('Work 34 links');
      expect(root.querySelector('.ui-tree__count')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('indents each level by one step through the level variable', async () => {
      const { row } = await setup();
      expect(row('Work').style.getPropertyValue('--ui-tree-level')).toBe('1');
      expect(row('Angular').style.getPropertyValue('--ui-tree-level')).toBe('2');
    });

    it('shows the folder icon by default and an explicit icon on fixed rows', async () => {
      const { row } = await setup();
      const href = (id: string) =>
        row(id).querySelector('.ui-tree__icon use')?.getAttribute('href') ?? '';
      expect(href('Work')).toContain('#sm-folder');
      expect(href('All links')).toContain('#sm-link');
    });

    it('hides closed children from the tab order and assistive tech through the closed class', async () => {
      const { item } = await setup();
      expect(item('Work').querySelector('.ui-tree__children')?.classList).toContain('is-open');
      expect(item('Clothes').querySelector('.ui-tree__children')?.classList).not.toContain(
        'is-open',
      );
    });

    it('omits the heading without folders and the active state without activeId', async () => {
      const { root, host, item, fixture } = await setup();
      host.activeId.set(null);
      host.nodes.set([]);
      await settle(fixture);
      expect(root.querySelector('.ui-tree__section')).toBeNull();
      expect(item('All links').hasAttribute('aria-current')).toBe(false);
    });

    it('has no axe violations', async () => {
      const { root } = await setup();
      expect(await axeViolations(root)).toEqual([]);
    });

    it('has no axe violations with count labels and an open menu button', async () => {
      const { root, host, fixture } = await setup();
      host.countLabel.set('{count} links');
      host.menuNodeId.set('work');
      await settle(fixture);
      expect(await axeViolations(root)).toEqual([]);
    });
  });

  describe('keyboard', () => {
    // Aria's roving focus starts on the first row (nav mode has no "selected" row to start on)
    // and handles keys relative to its own active row, so each test walks from there.
    async function start() {
      const ctx = await setup();
      const stop = ctx.root.querySelector<HTMLElement>('[tabindex="0"]') as HTMLElement;
      stop.focus();
      const press = (name: string, init: KeyboardEventInit = {}) =>
        ctx.key(document.activeElement as Element, name, init);
      const focusedName = () =>
        document.activeElement?.querySelector('.ui-tree__name')?.textContent ?? null;
      return { ...ctx, press, focusedName };
    }

    it('keeps one tab stop (roving focus)', async () => {
      const { root } = await setup();
      const stops = Array.from(root.querySelectorAll<HTMLElement>('[tabindex="0"]'));
      expect(stops).toHaveLength(1);
      expect(stops[0].getAttribute('role')).toBe('treeitem');
    });

    it('keeps the "..." buttons out of the tab order', async () => {
      const { root } = await setup();
      const buttons = Array.from(root.querySelectorAll<HTMLElement>('ui-button button'));
      expect(buttons.length).toBe(5);
      expect(buttons.every((button) => button.getAttribute('tabindex') === '-1')).toBe(true);
    });

    it('moves with ArrowDown / ArrowUp', async () => {
      const { press, focusedName } = await start();
      expect(focusedName()).toBe('All links');
      await press('ArrowDown');
      expect(focusedName()).toBe('Unsorted');
      await press('ArrowDown');
      expect(focusedName()).toBe('Work');
      await press('ArrowDown');
      expect(focusedName()).toBe('Angular');
      await press('ArrowUp');
      expect(focusedName()).toBe('Work');
    });

    it('skips the children of a closed folder', async () => {
      const { press, focusedName } = await start();
      await press('End');
      expect(focusedName()).toBe('Recipes');
      await press('ArrowUp');
      expect(focusedName()).toBe('Clothes');
      await press('ArrowUp');
      expect(focusedName()).toBe('Courses');
    });

    it('jumps with Home and End', async () => {
      const { press, focusedName } = await start();
      await press('End');
      expect(focusedName()).toBe('Recipes');
      await press('Home');
      expect(focusedName()).toBe('All links');
    });

    it('wraps from the last row to the first', async () => {
      const { press, focusedName } = await start();
      await press('End');
      await press('ArrowDown');
      expect(focusedName()).toBe('All links');
    });

    it('opens with ArrowRight, then steps into the first child', async () => {
      const { press, focusedName, item, host } = await start();
      await press('End');
      await press('ArrowUp');
      expect(focusedName()).toBe('Clothes');
      await press('ArrowRight');
      expect(item('Clothes').getAttribute('aria-expanded')).toBe('true');
      expect(host.toggled.at(-1)).toEqual({ node: FOLDERS[1], expanded: true });
      expect(focusedName()).toBe('Clothes');
      await press('ArrowRight');
      expect(focusedName()).toBe('Shoes');
    });

    it('steps to the parent from a child, then closes it with ArrowLeft', async () => {
      const { press, focusedName, item, host } = await start();
      await press('ArrowDown');
      await press('ArrowDown');
      await press('ArrowDown');
      expect(focusedName()).toBe('Angular');
      await press('ArrowLeft');
      expect(focusedName()).toBe('Work');
      await press('ArrowLeft');
      expect(item('Work').getAttribute('aria-expanded')).toBe('false');
      expect(host.toggled.at(-1)).toEqual({ node: FOLDERS[0], expanded: false });
      expect(focusedName()).toBe('Work');
    });

    it('chooses a row with Enter', async () => {
      const { press, item, host } = await start();
      await press('ArrowDown');
      await press('Enter');
      expect(host.selected.at(-1)?.id).toBe('unsorted');
      expect(item('Unsorted').getAttribute('aria-current')).toBe('page');
    });

    it('jumps to a row by typing its first letters', async () => {
      const { press, focusedName } = await start();
      await press('r');
      expect(focusedName()).toBe('Recipes');
    });
  });

  describe('pointer', () => {
    it('chooses a row on click and toggles a folder', async () => {
      const { row, click, host, item } = await setup();
      await click(row('Clothes'));
      expect(host.selected.at(-1)?.id).toBe('clothes');
      expect(item('Clothes').getAttribute('aria-expanded')).toBe('true');
    });

    it('toggles through the chevron without choosing the row', async () => {
      const { row, click, host, item } = await setup();
      const before = host.selected.length;
      await click(row('Clothes').querySelector('.ui-tree__twist') as Element);
      expect(item('Clothes').getAttribute('aria-expanded')).toBe('true');
      expect(host.toggled.at(-1)?.expanded).toBe(true);
      expect(host.selected.length).toBe(before);
      await click(row('Clothes').querySelector('.ui-tree__twist') as Element);
      expect(item('Clothes').getAttribute('aria-expanded')).toBe('false');
    });

    it('rotates the chevron through the is-open class', async () => {
      const { row, click } = await setup();
      const twist = row('Clothes').querySelector('.ui-tree__twist') as HTMLElement;
      expect(twist.classList).not.toContain('is-open');
      await click(twist);
      expect(twist.classList).toContain('is-open');
    });

    it('applies the ripple host class to every row', async () => {
      const { root } = await setup();
      const rows = root.querySelectorAll('.ui-tree__row');
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach((el) => expect(el.classList).toContain('ui-ripple-host'));
    });
  });

  describe('context menu', () => {
    it('emits on right click with the pointer position and the row as anchor', async () => {
      const { row, host, fixture } = await setup();
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 40,
        clientY: 60,
      });
      row('Work').dispatchEvent(event);
      await settle(fixture);
      expect(event.defaultPrevented).toBe(true);
      expect(host.menus).toHaveLength(1);
      expect(host.menus[0]).toMatchObject({
        trigger: 'pointer',
        position: { x: 40, y: 60 },
        anchor: row('Work'),
      });
      expect(host.menus[0].node.id).toBe('work');
    });

    it('emits from the "..." button with the inner button as anchor, without choosing the row', async () => {
      const { row, click, host } = await setup();
      const button = row('Work').querySelector('ui-button button') as HTMLElement;
      expect(button.getAttribute('aria-label')).toBe('Actions for Work');
      expect(button.getAttribute('aria-haspopup')).toBe('menu');
      expect(button.getAttribute('aria-expanded')).toBe('false');
      const before = host.selected.length;
      await click(button);
      expect(host.menus.at(-1)).toMatchObject({
        trigger: 'button',
        position: null,
        anchor: button,
      });
      expect(host.selected.length).toBe(before);
    });

    it('marks the button of the open menu as expanded', async () => {
      const { row, host, fixture } = await setup();
      host.menuNodeId.set('work');
      await settle(fixture);
      const button = row('Work').querySelector('ui-button button') as HTMLElement;
      expect(button.getAttribute('aria-expanded')).toBe('true');
      expect(row('Courses').querySelector('ui-button button')?.getAttribute('aria-expanded')).toBe(
        'false',
      );
    });

    it('emits with Shift+F10 and the context-menu key', async () => {
      const { item, row, key, host } = await setup();
      item('Work').focus();
      await key(item('Work'), 'F10', { shiftKey: true });
      expect(host.menus.at(-1)).toMatchObject({
        trigger: 'keyboard',
        position: null,
        anchor: row('Work'),
      });
      await key(item('Work'), 'ContextMenu');
      expect(host.menus).toHaveLength(2);
    });

    it('does not emit from a nested row for its parent', async () => {
      const { item, key, host } = await setup();
      item('Angular').focus();
      await key(item('Angular'), 'ContextMenu');
      expect(host.menus).toHaveLength(1);
      expect(host.menus[0].node.id).toBe('angular');
    });

    it('ignores other keys', async () => {
      const { item, key, host } = await setup();
      await key(item('Work'), 'F10');
      expect(host.menus).toHaveLength(0);
    });

    it('prevents the browser menu on the focused row itself', async () => {
      const { item, fixture } = await setup();
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      item('Work').dispatchEvent(event);
      await settle(fixture);
      expect(event.defaultPrevented).toBe(true);
    });

    it('has no menu on fixed rows and none without menuLabel', async () => {
      const { row, host, fixture, root } = await setup();
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      row('All links').dispatchEvent(event);
      expect(host.menus).toHaveLength(0);
      expect(row('All links').querySelector('ui-button')).toBeNull();
      host.menuLabel.set(undefined);
      await settle(fixture);
      expect(root.querySelector('ui-button')).toBeNull();
    });
  });
});
