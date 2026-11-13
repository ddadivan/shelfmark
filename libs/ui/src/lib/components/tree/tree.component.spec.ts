import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { axeViolations } from '../../../testing/axe';
import { compileScss, mediaBlocks, withoutMedia } from '../../../testing/scss';
import { UI_TREE_CONTEXT_MENU_TRIGGER } from './models/tree-context-menu-trigger.const';
import type { UiTreeContextMenuEvent } from './models/tree-context-menu-event.interface';
import type { UiTreeNode } from './models/tree-node.interface';
import type { UiTreeToggleEvent } from './models/tree-toggle-event.interface';
import { TREE_STORY_FIXED } from './stories/tree-story-fixed.const';
import { TREE_STORY_ID } from './stories/tree-story-id.const';
import { TREE_STORY_NAME } from './stories/tree-story-name.const';
import { TREE_STORY_NESTED } from './stories/tree-story-nested.const';
import { TreeComponent } from './tree.component';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { LONG_PRESS_DURATION_MS } from '../../directives/long-press';
import { TREE_DROP_OPEN_DELAY_MS } from './models/tree-drop-open-delay.const';

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
      [dropTargetId]="dropTargetId()"
      [noDropIds]="noDropIds()"
      dropLabel="Move here"
      (selected)="selected.push($event)"
      (toggled)="toggled.push($event)"
      (contextMenu)="menus.push($event)"
    >
      <button type="button" uiTreeHeadingAction aria-label="Create a folder" (click)="created += 1">
        +
      </button>
    </ui-tree>
  `,
})
class HostComponent {
  readonly fixed = signal(TREE_STORY_FIXED);
  readonly nodes = signal(TREE_STORY_NESTED);
  readonly activeId = signal<string | null>(TREE_STORY_ID.Angular);
  readonly menuLabel = signal<string | undefined>('Actions for {name}');
  readonly menuNodeId = signal<string | null>(null);
  readonly dropTargetId = signal<string | null>(null);
  readonly noDropIds = signal<readonly string[]>([]);
  created = 0;
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
  const row = item;
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

  describe('focus fallback', () => {
    const without = (id: string): readonly UiTreeNode[] =>
      TREE_STORY_NESTED.map((node) => ({
        ...node,
        children: node.children?.filter((child) => child.id !== id),
      })).filter((node) => node.id !== id);

    async function focusSetup() {
      const ctx = await setup();
      const tree = ctx.fixture.debugElement.query(By.directive(TreeComponent))
        .componentInstance as TreeComponent;
      return { ...ctx, component: tree };
    }

    it('focusRow focuses a visible row and refuses hidden and unknown rows', async () => {
      const { component, item } = await focusSetup();
      expect(component.focusRow(TREE_STORY_ID.Courses)).toBe(true);
      expect(document.activeElement).toBe(item(TREE_STORY_NAME.Courses));
      // Shoes sits in the collapsed Clothes folder.
      expect(component.focusRow(TREE_STORY_ID.Shoes)).toBe(false);
      expect(component.focusRow('nope')).toBe(false);
      expect(document.activeElement).toBe(item(TREE_STORY_NAME.Courses));
    });

    it('restoreFocusNear takes the nearest visible ancestor of a row hidden by a collapsed folder', async () => {
      const { component, host, fixture, item } = await focusSetup();
      const moved = TREE_STORY_NESTED[0].children?.[0] as UiTreeNode;
      host.nodes.set([
        { ...TREE_STORY_NESTED[0], children: [TREE_STORY_NESTED[0].children?.[1] as UiTreeNode] },
        { ...TREE_STORY_NESTED[1], children: [moved, ...(TREE_STORY_NESTED[1].children ?? [])] },
        TREE_STORY_NESTED[2],
      ]);
      await settle(fixture);
      expect(component.restoreFocusNear(TREE_STORY_ID.Angular)).toBe(TREE_STORY_ID.Clothes);
      expect(document.activeElement).toBe(item(TREE_STORY_NAME.Clothes));
    });

    it('focusRow makes the row the active one, so the arrow keys act from it', async () => {
      const { component, item, key } = await focusSetup();
      // Clothes is a collapsed folder; a plain DOM focus would leave Aria's active row on All links.
      expect(component.focusRow(TREE_STORY_ID.Clothes)).toBe(true);
      await key(item(TREE_STORY_NAME.Clothes), KEYBOARD_KEY.ArrowRight);
      expect(item(TREE_STORY_NAME.Clothes).getAttribute('aria-expanded')).toBe('true');
      expect(item(TREE_STORY_NAME.Clothes).getAttribute('tabindex')).toBe('0');
    });

    it('restoreFocusNear prefers the row itself when it is visible', async () => {
      const { component, item } = await focusSetup();
      expect(component.restoreFocusNear(TREE_STORY_ID.Courses)).toBe(TREE_STORY_ID.Courses);
      expect(document.activeElement).toBe(item(TREE_STORY_NAME.Courses));
    });

    it('moves focus to the parent when the focused row is removed', async () => {
      const { host, fixture, item } = await focusSetup();
      item(TREE_STORY_NAME.Courses).focus();
      host.nodes.set(without(TREE_STORY_ID.Courses));
      await settle(fixture);
      expect(document.activeElement).toBe(item(TREE_STORY_NAME.Work));
    });

    it('falls back to the previous sibling for a top-level row', async () => {
      const { host, fixture, item } = await focusSetup();
      item(TREE_STORY_NAME.Recipes).focus();
      host.nodes.set(without(TREE_STORY_ID.Recipes));
      await settle(fixture);
      expect(document.activeElement).toBe(item(TREE_STORY_NAME.Clothes));
    });

    it('falls back to the first row when the first folder is removed', async () => {
      const { host, fixture, item } = await focusSetup();
      item(TREE_STORY_NAME.Work).focus();
      host.nodes.set(without(TREE_STORY_ID.Work));
      await settle(fixture);
      expect(document.activeElement).toBe(item(TREE_STORY_NAME.All));
    });

    it('leaves focus alone when it is not on the removed row', async () => {
      const { host, fixture, item } = await focusSetup();
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      item(TREE_STORY_NAME.Courses).focus();
      outside.focus();
      host.nodes.set(without(TREE_STORY_ID.Courses));
      await settle(fixture);
      expect(document.activeElement).toBe(outside);
    });

    it('returns null when the tree has no row', async () => {
      const { host, fixture, component } = await focusSetup();
      host.nodes.set([]);
      host.fixed.set([]);
      await settle(fixture);
      expect(component.restoreFocusNear('gone')).toBeNull();
    });
  });

  describe('drop target', () => {
    it('marks every row with its id for hit testing', async () => {
      const { item } = await setup();

      expect(item(TREE_STORY_NAME.Recipes).dataset['uiTreeId']).toBe(TREE_STORY_ID.Recipes);
      expect(item(TREE_STORY_NAME.Unsorted).dataset['uiTreeId']).toBe(TREE_STORY_ID.Unsorted);
    });

    it('highlights the drop target and shows the badge instead of the count', async () => {
      const { fixture, host, item } = await setup();

      host.dropTargetId.set(TREE_STORY_ID.Recipes);
      await settle(fixture);

      const recipes = item(TREE_STORY_NAME.Recipes);
      expect(recipes.classList).toContain('ui-tree__row--drop');
      expect(recipes.querySelector('.ui-tree__drop-badge')?.textContent?.trim()).toBe('Move here');
      expect(recipes.querySelector('.ui-tree__count')).toBeNull();
      const named = (recipes.getAttribute('aria-labelledby') ?? '')
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent?.trim())
        .join(' ');
      expect(named).toBe('Recipes Move here');
      expect(item(TREE_STORY_NAME.Work).classList).not.toContain('ui-tree__row--drop');

      host.dropTargetId.set(null);
      await settle(fixture);
      expect(recipes.classList).not.toContain('ui-tree__row--drop');
      expect(recipes.querySelector('.ui-tree__count')).not.toBeNull();
    });

    it('mutes the rows that cannot take the drag, never highlights them', async () => {
      const { fixture, host, item } = await setup();

      host.noDropIds.set([TREE_STORY_ID.Favorites]);
      await settle(fixture);
      expect(item(TREE_STORY_NAME.Favorites).classList).toContain('ui-tree__row--no-drop');
      expect(item(TREE_STORY_NAME.Favorites).classList).not.toContain('ui-tree__row--drop');
      expect(item(TREE_STORY_NAME.Recipes).classList).not.toContain('ui-tree__row--no-drop');

      host.noDropIds.set([]);
      await settle(fixture);
      expect(item(TREE_STORY_NAME.Favorites).classList).not.toContain('ui-tree__row--no-drop');
    });

    it('marks no-drop rows aria-disabled while they last (#350)', async () => {
      const { fixture, host, item } = await setup();
      host.noDropIds.set([TREE_STORY_ID.Favorites]);
      await settle(fixture);
      const favorites = item(TREE_STORY_NAME.Favorites);

      expect(favorites.getAttribute('aria-disabled')).toBe('true');
      expect(item(TREE_STORY_NAME.Recipes).getAttribute('aria-disabled')).not.toBe('true');

      host.noDropIds.set([]);
      await settle(fixture);
      expect(favorites.getAttribute('aria-disabled')).not.toBe('true');
    });

    it('keeps the row height while it is the target and fades the badge in (none when reduced)', () => {
      const css = compileScss('lib/components/tree/tree.component.scss');
      const REDUCED = /prefers-reduced-motion: reduce/;
      const base = withoutMedia(css, REDUCED);
      const dropRow = /\.ui-tree__row--drop\s*\{([^}]*)\}/.exec(base)?.[1] ?? '';
      const badge = [...base.matchAll(/(?:^|\})\s*\.ui-tree__drop-badge\s*\{([^}]*)\}/g)]
        .map((match) => match[1])
        .join('\n');

      expect(dropRow).toContain('background');
      expect(dropRow).not.toMatch(/height|padding|margin/);
      expect(badge).toMatch(/animation:\s*ui-reveal var\(--duration-base\) var\(--ease-out\)/);
      expect(mediaBlocks(css, REDUCED).join('\n')).toMatch(
        /\.ui-tree__drop-badge\s*\{\s*animation:\s*none/,
      );
    });

    it('reorders with a line: 2px accent, rounded, no dot, takes no room; rows hold still (#315)', () => {
      const css = compileScss('lib/components/tree/tree.component.scss');
      const REDUCED = /prefers-reduced-motion: reduce/;
      const base = withoutMedia(css, REDUCED);
      const line = [
        ...base.matchAll(/(?:^|\})\s*\.ui-tree__list\.ui-drop-line--shown::after\s*\{([^}]*)\}/g),
      ]
        .map((match) => match[1])
        .join('\n');
      const slot = [...base.matchAll(/(?:^|\})\s*\.ui-tree__drop-slot\s*\{([^}]*)\}/g)]
        .map((match) => match[1])
        .join('\n');

      expect(line).toMatch(/position:\s*absolute/);
      expect(line).toMatch(/block-size:\s*0\.125rem/);
      expect(line).toMatch(/margin-block-start:\s*-0\.0625rem/);
      expect(line).toMatch(/background:\s*var\(--accent\)/);
      expect(line).toMatch(/border-radius:\s*var\(--radius-full\)/);
      expect(line).toMatch(/inset-inline-start:\s*var\(--ui-drop-line-left/);
      expect(line).toMatch(/inline-size:\s*var\(--ui-drop-line-width/);
      expect(line).toMatch(/animation:\s*ui-reveal var\(--duration-base\) var\(--ease-out\)/);
      expect(line).not.toMatch(/border:|box-shadow/);
      expect(base).toMatch(/\.ui-tree__list\s*\{[^}]*position:\s*relative/);
      // No glide: the siblings never animate a transform (CDK's offsets are removed in code).
      expect(base).not.toMatch(/\.ui-tree__item[^{]*\{[^}]*transition:\s*transform/);
      expect(css).not.toContain('!important');
      // The placeholder is a faint ghost where the row was: no tint, no outline.
      expect(slot).not.toMatch(/background|border:/);
      expect(slot).toMatch(/opacity:\s*0\.45/);
      expect(mediaBlocks(css, REDUCED).join('\n')).toMatch(
        /\.ui-tree__list\.ui-drop-line--shown::after\s*\{\s*animation:\s*none/,
      );
    });

    it('opens a closed folder after the target rests on it', async () => {
      const { fixture, host, item } = await setup();
      const clothes = item(TREE_STORY_NAME.Clothes);
      expect(clothes.getAttribute('aria-expanded')).toBe('false');
      vi.useFakeTimers();
      try {
        host.dropTargetId.set(TREE_STORY_ID.Clothes);
        fixture.detectChanges();
        TestBed.tick();
        vi.advanceTimersByTime(TREE_DROP_OPEN_DELAY_MS - 50);
        fixture.detectChanges();
        expect(clothes.getAttribute('aria-expanded')).toBe('false');

        vi.advanceTimersByTime(100);
        fixture.detectChanges();
        expect(clothes.getAttribute('aria-expanded')).toBe('true');
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not open a folder the target only passed over', async () => {
      const { fixture, host, item } = await setup();
      vi.useFakeTimers();
      try {
        host.dropTargetId.set(TREE_STORY_ID.Clothes);
        fixture.detectChanges();
        TestBed.tick();
        vi.advanceTimersByTime(200);
        host.dropTargetId.set(TREE_STORY_ID.Recipes);
        fixture.detectChanges();
        TestBed.tick();
        vi.advanceTimersByTime(TREE_DROP_OPEN_DELAY_MS);
        fixture.detectChanges();
        expect(item(TREE_STORY_NAME.Clothes).getAttribute('aria-expanded')).toBe('false');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('structure and ARIA', () => {
    it('renders a labelled navigation tree with fixed rows, the heading and the folders', async () => {
      const { root, tree } = await setup();
      expect(tree.getAttribute('aria-label')).toBe('Library');
      expect(root.querySelector('.ui-tree__section')?.textContent?.trim()).toBe('Folders');
      const names = Array.from(root.querySelectorAll('.ui-tree__name')).map((el) => el.textContent);
      expect(names.slice(0, 5)).toEqual([
        TREE_STORY_NAME.All,
        TREE_STORY_NAME.Unsorted,
        TREE_STORY_NAME.Favorites,
        TREE_STORY_NAME.Work,
        TREE_STORY_NAME.Angular,
      ]);
    });

    it('sets aria-level, aria-expanded and aria-current', async () => {
      const { item } = await setup();
      expect(item(TREE_STORY_NAME.All).getAttribute('aria-level')).toBe('1');
      expect(item(TREE_STORY_NAME.Work).getAttribute('aria-level')).toBe('1');
      expect(item(TREE_STORY_NAME.Angular).getAttribute('aria-level')).toBe('2');
      expect(item(TREE_STORY_NAME.Work).getAttribute('aria-expanded')).toBe('true');
      expect(item(TREE_STORY_NAME.Clothes).getAttribute('aria-expanded')).toBe('false');
      expect(item(TREE_STORY_NAME.Recipes).hasAttribute('aria-expanded')).toBe(false);
      expect(item(TREE_STORY_NAME.Angular).getAttribute('aria-current')).toBe('page');
      expect(item(TREE_STORY_NAME.Work).hasAttribute('aria-current')).toBe(false);
    });

    it('names a row by its name and count, not by its children', async () => {
      const { item, root } = await setup();
      const labelled = (id: string) =>
        (item(id).getAttribute('aria-labelledby') ?? '')
          .split(' ')
          .map((ref) => root.querySelector(`[id="${ref}"]`)?.textContent?.trim())
          .join(' ');
      expect(labelled(TREE_STORY_NAME.Work)).toBe('Work 34');
    });

    it('indents each level by one step through the level variable', async () => {
      const { row } = await setup();
      expect(row(TREE_STORY_NAME.Work).style.getPropertyValue('--ui-tree-level')).toBe('1');
      expect(row(TREE_STORY_NAME.Angular).style.getPropertyValue('--ui-tree-level')).toBe('2');
    });

    it('shows a folder tile on folder rows and an explicit icon on fixed rows', async () => {
      const { row } = await setup();
      const href = (id: string) =>
        row(id).querySelector('.ui-tree__icon use')?.getAttribute('href') ?? '';
      // Folder rows draw their glyph in a graphite `ui-folder-icon` tile.
      const tile = row(TREE_STORY_NAME.Work).querySelector('ui-folder-icon');
      expect(tile?.classList).toContain('ui-folder-icon--sm');
      expect(tile?.querySelector('use')?.getAttribute('href')).toContain('#sm-folder');
      expect(href(TREE_STORY_NAME.All)).toContain('#sm-link');
    });

    it('draws the folder tile in the node colour and icon, graphite without one', async () => {
      const { host, fixture, row } = await setup();
      host.nodes.set([
        { id: 'a', name: 'Angular', colour: 'clay', icon: 'star' },
        { id: 'b', name: 'Plain' },
      ]);
      await settle(fixture);
      const tile = (name: string) => row(name).querySelector('ui-folder-icon');
      expect(tile('Angular')?.classList).toContain('ui-folder-icon--clay');
      expect(tile('Angular')?.querySelector('use')?.getAttribute('href')).toContain('#sm-star');
      expect(tile('Plain')?.classList).toContain('ui-folder-icon--graphite');
    });

    it('hides closed children from the tab order and assistive tech through the closed class', async () => {
      const { item } = await setup();
      expect(
        item(TREE_STORY_NAME.Work).closest('li')?.querySelector('.ui-tree__children')?.classList,
      ).toContain('is-open');
      expect(
        item(TREE_STORY_NAME.Clothes).closest('li')?.querySelector('.ui-tree__children')?.classList,
      ).not.toContain('is-open');
    });

    it('keeps the heading and its action without folders, and has no active state without activeId', async () => {
      const { root, host, item, fixture } = await setup();
      host.activeId.set(null);
      host.nodes.set([]);
      await settle(fixture);
      expect(root.querySelector('.ui-tree__section')?.textContent?.trim()).toBe('Folders');
      expect(root.querySelector('.ui-tree__action button')).not.toBeNull();
      expect(item(TREE_STORY_NAME.All).hasAttribute('aria-current')).toBe(false);
    });

    it('the heading action is projected, works and does not choose a row', async () => {
      const { root, host, click, key, tree } = await setup();
      const button = root.querySelector<HTMLElement>('.ui-tree__action button');
      expect(button).not.toBeNull();
      await click(button as HTMLElement);
      await key(button as HTMLElement, KEYBOARD_KEY.Enter);
      expect(host.created).toBe(1);
      expect(host.selected).toEqual([]);
      // Not inside the tree element: a button is not an allowed child of role="tree".
      expect(tree.contains(button)).toBe(false);
    });

    it('has no axe violations', async () => {
      const { root } = await setup();
      expect(await axeViolations(root)).toEqual([]);
    });

    it('has no axe violations with an open menu button', async () => {
      const { root, host, fixture } = await setup();
      host.menuNodeId.set(TREE_STORY_ID.Work);
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
      expect(focusedName()).toBe(TREE_STORY_NAME.All);
      await press(KEYBOARD_KEY.ArrowDown);
      expect(focusedName()).toBe(TREE_STORY_NAME.Unsorted);
      await press(KEYBOARD_KEY.ArrowDown);
      expect(focusedName()).toBe(TREE_STORY_NAME.Favorites);
      await press(KEYBOARD_KEY.ArrowDown);
      expect(focusedName()).toBe(TREE_STORY_NAME.Work);
      await press(KEYBOARD_KEY.ArrowDown);
      expect(focusedName()).toBe(TREE_STORY_NAME.Angular);
      await press(KEYBOARD_KEY.ArrowUp);
      expect(focusedName()).toBe(TREE_STORY_NAME.Work);
    });

    it('skips the children of a closed folder', async () => {
      const { press, focusedName } = await start();
      await press(KEYBOARD_KEY.End);
      expect(focusedName()).toBe(TREE_STORY_NAME.Recipes);
      await press(KEYBOARD_KEY.ArrowUp);
      expect(focusedName()).toBe(TREE_STORY_NAME.Clothes);
      await press(KEYBOARD_KEY.ArrowUp);
      expect(focusedName()).toBe(TREE_STORY_NAME.Courses);
    });

    it('jumps with Home and End', async () => {
      const { press, focusedName } = await start();
      await press(KEYBOARD_KEY.End);
      expect(focusedName()).toBe(TREE_STORY_NAME.Recipes);
      await press(KEYBOARD_KEY.Home);
      expect(focusedName()).toBe(TREE_STORY_NAME.All);
    });

    it('wraps from the last row to the first', async () => {
      const { press, focusedName } = await start();
      await press(KEYBOARD_KEY.End);
      await press(KEYBOARD_KEY.ArrowDown);
      expect(focusedName()).toBe(TREE_STORY_NAME.All);
    });

    it('opens with ArrowRight, then steps into the first child', async () => {
      const { press, focusedName, item, host } = await start();
      await press(KEYBOARD_KEY.End);
      await press(KEYBOARD_KEY.ArrowUp);
      expect(focusedName()).toBe(TREE_STORY_NAME.Clothes);
      await press(KEYBOARD_KEY.ArrowRight);
      expect(item(TREE_STORY_NAME.Clothes).getAttribute('aria-expanded')).toBe('true');
      expect(host.toggled.at(-1)).toEqual({ node: TREE_STORY_NESTED[1], expanded: true });
      expect(focusedName()).toBe(TREE_STORY_NAME.Clothes);
      await press(KEYBOARD_KEY.ArrowRight);
      expect(focusedName()).toBe(TREE_STORY_NAME.Shoes);
    });

    it('steps to the parent from a child, then closes it with ArrowLeft', async () => {
      const { press, focusedName, item, host } = await start();
      for (let i = 0; i < 4; i++) {
        await press(KEYBOARD_KEY.ArrowDown);
      }
      expect(focusedName()).toBe(TREE_STORY_NAME.Angular);
      await press(KEYBOARD_KEY.ArrowLeft);
      expect(focusedName()).toBe(TREE_STORY_NAME.Work);
      await press(KEYBOARD_KEY.ArrowLeft);
      expect(item(TREE_STORY_NAME.Work).getAttribute('aria-expanded')).toBe('false');
      expect(host.toggled.at(-1)).toEqual({ node: TREE_STORY_NESTED[0], expanded: false });
      expect(focusedName()).toBe(TREE_STORY_NAME.Work);
    });

    it('chooses a row with Enter', async () => {
      const { press, item, host } = await start();
      await press(KEYBOARD_KEY.ArrowDown);
      await press(KEYBOARD_KEY.Enter);
      expect(host.selected.at(-1)?.id).toBe(TREE_STORY_ID.Unsorted);
      expect(item(TREE_STORY_NAME.Unsorted).getAttribute('aria-current')).toBe('page');
    });

    it('jumps to a row by typing its first letters', async () => {
      const { press, focusedName } = await start();
      await press('r');
      expect(focusedName()).toBe(TREE_STORY_NAME.Recipes);
    });
  });

  describe('pointer', () => {
    it('chooses a row on click and toggles a folder', async () => {
      const { row, click, host, item } = await setup();
      await click(row(TREE_STORY_NAME.Clothes));
      expect(host.selected.at(-1)?.id).toBe(TREE_STORY_ID.Clothes);
      expect(item(TREE_STORY_NAME.Clothes).getAttribute('aria-expanded')).toBe('true');
    });

    it('toggles through the chevron without choosing the row', async () => {
      const { row, click, host, item } = await setup();
      const before = host.selected.length;
      await click(row(TREE_STORY_NAME.Clothes).querySelector('.ui-tree__twist') as Element);
      expect(item(TREE_STORY_NAME.Clothes).getAttribute('aria-expanded')).toBe('true');
      expect(host.toggled.at(-1)?.expanded).toBe(true);
      expect(host.selected.length).toBe(before);
      await click(row(TREE_STORY_NAME.Clothes).querySelector('.ui-tree__twist') as Element);
      expect(item(TREE_STORY_NAME.Clothes).getAttribute('aria-expanded')).toBe('false');
    });

    it('rotates the chevron through the is-open class', async () => {
      const { row, click } = await setup();
      const twist = row(TREE_STORY_NAME.Clothes).querySelector('.ui-tree__twist') as HTMLElement;
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
      row(TREE_STORY_NAME.Work).dispatchEvent(event);
      await settle(fixture);
      expect(event.defaultPrevented).toBe(true);
      expect(host.menus).toHaveLength(1);
      expect(host.menus[0]).toMatchObject({
        trigger: UI_TREE_CONTEXT_MENU_TRIGGER.Pointer,
        position: { x: 40, y: 60 },
        anchor: row(TREE_STORY_NAME.Work),
      });
      expect(host.menus[0].node.id).toBe(TREE_STORY_ID.Work);
    });

    it('emits from the "..." button with the inner button as anchor, without choosing the row', async () => {
      const { row, click, host } = await setup();
      const button = row(TREE_STORY_NAME.Work).querySelector('ui-button button') as HTMLElement;
      expect(button.getAttribute('aria-label')).toBe('Actions for Work');
      expect(button.getAttribute('aria-haspopup')).toBe('menu');
      expect(button.getAttribute('aria-expanded')).toBe('false');
      const before = host.selected.length;
      await click(button);
      expect(host.menus.at(-1)).toMatchObject({
        trigger: UI_TREE_CONTEXT_MENU_TRIGGER.Button,
        position: null,
        anchor: button,
      });
      expect(host.selected.length).toBe(before);
    });

    it('marks the button of the open menu as expanded', async () => {
      const { row, host, fixture } = await setup();
      host.menuNodeId.set(TREE_STORY_ID.Work);
      await settle(fixture);
      const button = row(TREE_STORY_NAME.Work).querySelector('ui-button button') as HTMLElement;
      expect(button.getAttribute('aria-expanded')).toBe('true');
      expect(
        row(TREE_STORY_NAME.Courses)
          .querySelector('ui-button button')
          ?.getAttribute('aria-expanded'),
      ).toBe('false');
    });

    it('emits with Shift+F10 and the context-menu key', async () => {
      const { item, row, key, host } = await setup();
      item(TREE_STORY_NAME.Work).focus();
      await key(item(TREE_STORY_NAME.Work), KEYBOARD_KEY.F10, { shiftKey: true });
      expect(host.menus.at(-1)).toMatchObject({
        trigger: UI_TREE_CONTEXT_MENU_TRIGGER.Keyboard,
        position: null,
        anchor: row(TREE_STORY_NAME.Work),
      });
      await key(item(TREE_STORY_NAME.Work), KEYBOARD_KEY.ContextMenu);
      expect(host.menus).toHaveLength(2);
    });

    it('does not emit from a nested row for its parent', async () => {
      const { item, key, host } = await setup();
      item(TREE_STORY_NAME.Angular).focus();
      await key(item(TREE_STORY_NAME.Angular), KEYBOARD_KEY.ContextMenu);
      expect(host.menus).toHaveLength(1);
      expect(host.menus[0].node.id).toBe(TREE_STORY_ID.Angular);
    });

    it('ignores other keys', async () => {
      const { item, key, host } = await setup();
      await key(item(TREE_STORY_NAME.Work), KEYBOARD_KEY.F10);
      expect(host.menus).toHaveLength(0);
    });

    const contextmenu = (x: number, y: number) =>
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y });
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    it('emits from Alt+Enter on a folder row, not on a fixed row', async () => {
      const { item, row, key, host } = await setup();
      await key(item(TREE_STORY_NAME.Work), KEYBOARD_KEY.Enter, { altKey: true });
      expect(host.menus).toHaveLength(1);
      expect(host.menus[0]).toMatchObject({
        trigger: UI_TREE_CONTEXT_MENU_TRIGGER.Keyboard,
        anchor: row(TREE_STORY_NAME.Work),
      });
      expect(host.selected).toHaveLength(0);
      await key(item(TREE_STORY_NAME.All), KEYBOARD_KEY.Enter, { altKey: true });
      expect(host.menus).toHaveLength(1);
    });

    it('does not repeat the request when the browser echoes the key as a contextmenu event', async () => {
      const { item, key, host, fixture } = await setup();
      await key(item(TREE_STORY_NAME.Work), KEYBOARD_KEY.ContextMenu);
      const echo = contextmenu(30, 30);
      item(TREE_STORY_NAME.Work).dispatchEvent(echo);
      await settle(fixture);
      expect(echo.defaultPrevented).toBe(true);
      expect(host.menus).toHaveLength(1);
      expect(host.menus[0].trigger).toBe(UI_TREE_CONTEXT_MENU_TRIGGER.Keyboard);
      // The echo was consumed: the next right click is a pointer request.
      item(TREE_STORY_NAME.Work).dispatchEvent(contextmenu(30, 30));
      expect(host.menus.at(-1)?.trigger).toBe(UI_TREE_CONTEXT_MENU_TRIGGER.Pointer);
    });

    it('survives a long-held key: repeats emit once and the echo is still swallowed', async () => {
      const { item, key, host, fixture } = await setup();
      await key(item(TREE_STORY_NAME.Work), KEYBOARD_KEY.ContextMenu);
      await key(item(TREE_STORY_NAME.Work), KEYBOARD_KEY.ContextMenu, { repeat: true });
      await wait(150);
      await key(item(TREE_STORY_NAME.Work), KEYBOARD_KEY.ContextMenu, { repeat: true });
      item(TREE_STORY_NAME.Work).dispatchEvent(contextmenu(30, 30));
      await settle(fixture);
      expect(host.menus).toHaveLength(1);
    });

    it('swallows an echo that arrives just after the key is released, then re-arms the pointer', async () => {
      const { item, key, host, fixture } = await setup();
      await key(item(TREE_STORY_NAME.Work), KEYBOARD_KEY.F10, { shiftKey: true });
      item(TREE_STORY_NAME.Work).dispatchEvent(
        new KeyboardEvent('keyup', { key: KEYBOARD_KEY.F10, bubbles: true }),
      );
      item(TREE_STORY_NAME.Work).dispatchEvent(contextmenu(30, 30));
      expect(host.menus).toHaveLength(1);
      await wait(200);
      await settle(fixture);
      item(TREE_STORY_NAME.Work).dispatchEvent(contextmenu(30, 30));
      expect(host.menus).toHaveLength(2);
      expect(host.menus[1].trigger).toBe(UI_TREE_CONTEXT_MENU_TRIGGER.Pointer);
    });

    it('drops a pending echo on blur', async () => {
      const { item, key, host } = await setup();
      await key(item(TREE_STORY_NAME.Work), KEYBOARD_KEY.ContextMenu);
      item(TREE_STORY_NAME.Work).dispatchEvent(new FocusEvent('blur'));
      item(TREE_STORY_NAME.Work).dispatchEvent(contextmenu(30, 30));
      expect(host.menus.map((m) => m.trigger)).toEqual([
        UI_TREE_CONTEXT_MENU_TRIGGER.Keyboard,
        UI_TREE_CONTEXT_MENU_TRIGGER.Pointer,
      ]);
    });

    it('treats a contextmenu event at 0, 0 as a keyboard request', async () => {
      const { item, row, host } = await setup();
      item(TREE_STORY_NAME.Work).dispatchEvent(contextmenu(0, 0));
      expect(host.menus).toHaveLength(1);
      expect(host.menus[0]).toMatchObject({
        trigger: UI_TREE_CONTEXT_MENU_TRIGGER.Keyboard,
        position: null,
        anchor: row(TREE_STORY_NAME.Work),
      });
    });

    it('keeps keys from the "..." button away from the tree (no selection, no typeahead)', async () => {
      const { row, key, click, host, item } = await setup();
      const button = row(TREE_STORY_NAME.Work).querySelector('ui-button button') as HTMLElement;
      const before = document.activeElement;
      for (const name of [
        KEYBOARD_KEY.Enter,
        KEYBOARD_KEY.Space,
        'r',
        KEYBOARD_KEY.ArrowDown,
        KEYBOARD_KEY.End,
      ]) {
        await key(button, name);
      }
      expect(host.selected).toHaveLength(0);
      expect(host.menus).toHaveLength(0);
      expect(document.activeElement).toBe(before);
      expect(item(TREE_STORY_NAME.Work).getAttribute('aria-expanded')).toBe('true');
      // The browser turns Enter / Space on the button into one click.
      await click(button);
      expect(host.menus).toHaveLength(1);
      expect(host.selected).toHaveLength(0);
    });

    it('opens the menu from the keyboard even when focus is on the "..." button', async () => {
      const { row, key, host } = await setup();
      const button = row(TREE_STORY_NAME.Work).querySelector('ui-button button') as HTMLElement;
      await key(button, KEYBOARD_KEY.ContextMenu);
      expect(host.menus).toHaveLength(1);
      expect(host.menus[0].trigger).toBe(UI_TREE_CONTEXT_MENU_TRIGGER.Keyboard);
    });

    it('does not ripple when the "..." button is pressed', async () => {
      const { row } = await setup();
      const button = row(TREE_STORY_NAME.Work).querySelector('ui-button button') as HTMLElement;
      button.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 5, clientY: 5 }),
      );
      expect(row(TREE_STORY_NAME.Work).querySelector(':scope > .ui-ripple')).toBeNull();
    });

    describe('long press', () => {
      const touch = (type: string): PointerEvent =>
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          pointerType: 'touch',
          clientX: 40,
          clientY: 60,
        });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('emits contextMenu at the touch point for a folder row', async () => {
        const { row, host } = await setup();
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        const work = row(TREE_STORY_NAME.Work);
        work.dispatchEvent(touch('pointerdown'));
        vi.advanceTimersByTime(LONG_PRESS_DURATION_MS);
        expect(host.menus).toHaveLength(1);
        expect(host.menus[0]).toMatchObject({
          trigger: UI_TREE_CONTEXT_MENU_TRIGGER.Pointer,
          position: { x: 40, y: 60 },
          anchor: work,
        });
        expect(host.menus[0].node.id).toBe(TREE_STORY_ID.Work);
      });

      it('does nothing on a fixed row or before the hold has passed', async () => {
        const { row, host } = await setup();
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        row(TREE_STORY_NAME.All).dispatchEvent(touch('pointerdown'));
        vi.advanceTimersByTime(LONG_PRESS_DURATION_MS);
        row(TREE_STORY_NAME.Work).dispatchEvent(touch('pointerdown'));
        vi.advanceTimersByTime(LONG_PRESS_DURATION_MS - 1);
        expect(host.menus).toHaveLength(0);
      });
    });

    it('has no menu on fixed rows and none without menuLabel', async () => {
      const { row, host, fixture, root } = await setup();
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      row(TREE_STORY_NAME.All).dispatchEvent(event);
      expect(host.menus).toHaveLength(0);
      expect(row(TREE_STORY_NAME.All).querySelector('ui-button')).toBeNull();
      host.menuLabel.set(undefined);
      await settle(fixture);
      expect(root.querySelector('ui-button')).toBeNull();
    });
  });
});
