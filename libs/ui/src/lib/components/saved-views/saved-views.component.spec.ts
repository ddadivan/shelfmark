import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { axeViolations } from '../../../testing/axe';
import { compileScss, mediaBlocks } from '../../../testing/scss';
import { KEYBOARD_KEY } from '../../models/keyboard';
import type { SavedViewItem } from './models/saved-view-item.interface';
import type { SavedViewMenuRequest } from './models/saved-view-menu-request.interface';
import { SAVED_VIEWS_LAYOUT } from './models/saved-views-layout.const';
import type { SavedViewsLayout } from './models/saved-views-layout.type';
import { SavedViewsComponent } from './saved-views.component';

const ITEMS: SavedViewItem[] = [
  { id: 'all', label: 'All', count: 12 },
  { id: 'v', label: 'Videos', count: 5, menuLabel: 'Actions for Videos' },
  { id: 'a', label: 'Articles', count: null, menuLabel: 'Actions for Articles' },
];

@Component({
  imports: [SavedViewsComponent],
  template: `
    <ui-saved-views
      ariaLabel="Saved views"
      [items]="items()"
      [activeId]="activeId()"
      [addLabel]="addLabel()"
      [layout]="layout()"
      (selected)="selected.set($event)"
      (add)="adds.set(adds() + 1)"
      (menuRequested)="menu.set($event)"
    />
  `,
})
class HostComponent {
  readonly items = signal<SavedViewItem[]>(ITEMS);
  readonly activeId = signal<string | null>('all');
  readonly addLabel = signal('Save this view');
  readonly layout = signal<SavedViewsLayout>(SAVED_VIEWS_LAYOUT.Wrap);
  readonly selected = signal<string | null>(null);
  readonly adds = signal(0);
  readonly menu = signal<SavedViewMenuRequest | null>(null);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  const bodies = () => [...host.querySelectorAll<HTMLButtonElement>('.ui-saved-views__body')];
  const widgets = () => [...host.querySelectorAll<HTMLElement>('[ngToolbarWidget]')];
  return { fixture, host, update, bodies, widgets, cmp: fixture.componentInstance };
}

function key(target: HTMLElement, name: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
}

describe('SavedViewsComponent', () => {
  it('is a named toolbar of toggle buttons with label and count', () => {
    const { host, bodies } = setup();
    const bar = host.querySelector('[role="toolbar"]');
    expect(bar?.getAttribute('aria-label')).toBe('Saved views');
    expect(bodies().map((b) => b.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'All 12',
      'Videos 5',
      'Articles',
    ]);
    expect(bodies().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    expect(host.querySelectorAll('.ui-saved-views__chip--on')).toHaveLength(1);
    expect(host.querySelectorAll('b.ui-saved-views__count')).toHaveLength(2);
  });

  it('focusItem moves focus to a chip and says whether it exists', () => {
    const { bodies, fixture } = setup();
    const component = fixture.debugElement.query(By.directive(SavedViewsComponent))
      .componentInstance as SavedViewsComponent;
    expect(component.focusItem('v')).toBe(true);
    expect(document.activeElement).toBe(bodies()[1]);
    expect(component.focusItem('missing')).toBe(false);
  });

  it('pads a one-digit count with a figure space so every count of two digits or less has one width', () => {
    const { host, update } = setup();
    update((c) =>
      c.items.set([
        { id: 'a', label: 'A', count: 7 },
        { id: 'b', label: 'B', count: 39 },
        { id: 'c', label: 'C', count: 120 },
      ]),
    );
    const counts = [...host.querySelectorAll('.ui-saved-views__count')].map(
      (node) => node.textContent,
    );
    expect(counts).toEqual(['7\u2007', '39', '120']);
  });

  it('presses the chip of activeId, and none when it matches nothing', () => {
    const { update, bodies } = setup();
    update((c) => c.activeId.set('v'));
    expect(bodies()[1]?.getAttribute('aria-pressed')).toBe('true');
    update((c) => c.activeId.set(null));
    expect(bodies().every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
  });

  it('emits selected with the id, also for the active chip', () => {
    const { bodies, cmp } = setup();
    bodies()[1]?.click();
    expect(cmp.selected()).toBe('v');
    bodies()[0]?.click();
    expect(cmp.selected()).toBe('all');
  });

  it('renders a menu button only for chips with a menuLabel and emits its element', () => {
    const { host, cmp, bodies } = setup();
    const menus = [...host.querySelectorAll<HTMLButtonElement>('.ui-saved-views__menu')];
    expect(menus.map((m) => m.getAttribute('aria-label'))).toEqual([
      'Actions for Videos',
      'Actions for Articles',
    ]);
    expect(menus[0]?.getAttribute('aria-haspopup')).toBe('menu');
    menus[0]?.click();
    expect(cmp.menu()).toEqual({ id: 'v', origin: menus[0] });
    // The menu click does not select the chip.
    expect(cmp.selected()).toBeNull();
    // A right click on a chip with a menu asks for it; on one without, the browser menu stays.
    const context = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    bodies()[2]?.dispatchEvent(context);
    expect(context.defaultPrevented).toBe(true);
    expect(cmp.menu()).toEqual({ id: 'a', origin: bodies()[2] });
    const plain = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    bodies()[0]?.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(false);
  });

  it('has a dashed add button that emits add, and none without a label', () => {
    const { host, update, cmp } = setup();
    const add = host.querySelector<HTMLButtonElement>('.ui-saved-views__add');
    expect(add?.textContent?.trim()).toBe('Save this view');
    add?.click();
    expect(cmp.adds()).toBe(1);
    update((c) => c.addLabel.set(''));
    expect(host.querySelector('.ui-saved-views__add')).toBeNull();
  });

  it('is one tab stop; arrows, Home and End move between the widgets', async () => {
    const { widgets, fixture } = setup();
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    await fixture.whenStable();
    const all = widgets();
    expect(all.filter((w) => w.tabIndex === 0)).toHaveLength(1);
    const press = async (target: Element | null, name: string) => {
      key(target as HTMLElement, name);
      fixture.detectChanges();
      await fixture.whenStable();
    };
    all[0]?.focus();
    await press(all[0] ?? null, KEYBOARD_KEY.ArrowRight);
    expect(document.activeElement).toBe(all[1]);
    await press(document.activeElement, KEYBOARD_KEY.End);
    expect(document.activeElement).toBe(all.at(-1));
    await press(document.activeElement, KEYBOARD_KEY.Home);
    expect(document.activeElement).toBe(all[0]);
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('switches to one scrolling row with the scroll layout', () => {
    const { host, update } = setup();
    const el = host.querySelector('ui-saved-views') as HTMLElement;
    expect(el.classList.contains('ui-saved-views--scroll')).toBe(false);
    update((c) => c.layout.set(SAVED_VIEWS_LAYOUT.Scroll));
    expect(el.classList.contains('ui-saved-views--scroll')).toBe(true);
  });

  it('has no axe violations', async () => {
    const { host, update } = setup();
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.layout.set(SAVED_VIEWS_LAYOUT.Scroll));
    expect(await axeViolations(host)).toEqual([]);
  });

  it('shows the menu button on hover or focus only for hover pointers, never by opacity', () => {
    const css = compileScss('lib/components/saved-views/saved-views.component.scss');
    const hoverBlocks = mediaBlocks(css, /\(hover: ?hover\)/).join('\n');
    expect(hoverBlocks).toContain('clip-path: inset(50%)');
    expect(hoverBlocks).toContain('.ui-saved-views__chip--menu:focus-within .ui-saved-views__menu');
    expect(css).not.toMatch(/opacity/);
    // Nothing moves: no transition or animation to switch off under reduced motion.
    expect(css).not.toMatch(/transition|animation/);
  });

  it('never rings the whole toolbar: the container is not a tab stop, the chips draw the ring', () => {
    const css = compileScss('lib/components/saved-views/saved-views.component.scss');

    expect(css).toMatch(/\.ui-saved-views__bar:focus\s*\{\s*outline:\s*none/);
    expect(css).toMatch(/\.ui-saved-views__add\):focus-visible\s*\{[^}]*outline:\s*2px solid/);
  });
});
