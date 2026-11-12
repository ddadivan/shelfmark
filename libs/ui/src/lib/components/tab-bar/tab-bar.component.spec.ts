import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { compileScss, mediaBlocks, withoutMedia } from '../../../testing/scss';
import type { TabBarItem } from './models/tab-bar-item.interface';
import type { TabBarSelection } from './models/tab-bar-selection.interface';
import { TabBarComponent } from './tab-bar.component';

const ITEMS: readonly TabBarItem[] = [
  { id: 'library', label: 'Library', icon: 'saved-link', href: '/links' },
  { id: 'search', label: 'Search', icon: 'search', href: '/search' },
  { id: 'tags', label: 'Tags', icon: 'tag', href: '/tags' },
  { id: 'you', label: 'You', icon: 'user' },
];

@Component({
  imports: [TabBarComponent],
  template: `<ui-tab-bar
    [items]="items()"
    [active]="active()"
    [fixed]="fixed()"
    ariaLabel="Main"
    addLabel="Add link"
    (selected)="onSelected($event)"
    (add)="added = added + 1"
  />`,
})
class HostComponent {
  readonly items = signal<readonly TabBarItem[]>(ITEMS);
  readonly active = signal<string | undefined>('library');
  readonly fixed = signal(true);
  added = 0;
  readonly onSelected = vi.fn<(selection: TabBarSelection) => void>();
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    root,
    host: fixture.componentInstance,
    bar: root.querySelector<HTMLElement>('ui-tab-bar')!,
    tabs: () => Array.from(root.querySelectorAll<HTMLElement>('.ui-tab-bar__tab')),
  };
}

describe('TabBarComponent', () => {
  it('is a nav with the Add button in the middle and a visible label on every tab', () => {
    const { root, tabs } = setup();
    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Main');
    const slots = Array.from(root.querySelectorAll('li')).map(
      (li) => li.querySelector('.ui-tab-bar__tab, .ui-tab-bar__add')?.className,
    );
    expect(slots).toHaveLength(5);
    expect(slots[2]).toContain('ui-tab-bar__add');
    expect(tabs().map((tab) => tab.textContent?.trim())).toEqual([
      'Library',
      'Search',
      'Tags',
      'You',
    ]);
    expect(root.querySelector('.ui-tab-bar__add')?.getAttribute('aria-label')).toBe('Add link');
  });

  it('renders links for items with an href and buttons without', () => {
    const { tabs } = setup();
    expect(tabs()[0].tagName).toBe('A');
    expect(tabs()[0].getAttribute('href')).toBe('/links');
    expect(tabs()[3].tagName).toBe('BUTTON');
  });

  it('marks only the active tab with aria-current="page"', () => {
    const { fixture, host, tabs } = setup();
    expect(tabs().map((tab) => tab.getAttribute('aria-current'))).toEqual([
      'page',
      null,
      null,
      null,
    ]);
    host.active.set('you');
    fixture.detectChanges();
    expect(tabs().map((tab) => tab.getAttribute('aria-current'))).toEqual([
      null,
      null,
      null,
      'page',
    ]);
    expect(tabs()[3].classList).toContain('ui-tab-bar__tab--active');
  });

  it('emits selected with the event on a plain left click, so the app can route', () => {
    const { host, tabs } = setup();
    host.onSelected.mockImplementation(({ event }) => event.preventDefault());
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    tabs()[1].dispatchEvent(event);
    expect(host.onSelected).toHaveBeenCalledWith({ id: 'search', event });
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves modified clicks to the browser', () => {
    const { host, tabs } = setup();
    tabs()[1].dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    tabs()[1].dispatchEvent(new MouseEvent('click', { bubbles: true, metaKey: true }));
    tabs()[1].dispatchEvent(new MouseEvent('click', { bubbles: true, button: 1 }));
    expect(host.onSelected).not.toHaveBeenCalled();
  });

  it('activates a button tab with the keyboard (native Enter / Space click)', () => {
    const { host, tabs } = setup();
    tabs()[3].focus();
    expect(document.activeElement).toBe(tabs()[3]);
    tabs()[3].click();
    expect(host.onSelected).toHaveBeenCalledOnce();
    expect(host.onSelected.mock.calls[0][0].id).toBe('you');
  });

  it('keeps every tab and the Add button in the tab order, in visual order', () => {
    const { root } = setup();
    const stops = Array.from(root.querySelectorAll<HTMLElement>('a[href], button')).map(
      (el) => el.tabIndex,
    );
    expect(stops).toEqual([0, 0, 0, 0, 0]);
    const order = Array.from(root.querySelectorAll('li > *')).map(
      (el) => el.textContent?.trim() || 'add',
    );
    expect(order).toEqual(['Library', 'Search', 'add', 'Tags', 'You']);
  });

  it('emits add from the primary button', () => {
    const { host, root } = setup();
    root.querySelector<HTMLElement>('.ui-tab-bar__add')?.click();
    expect(host.added).toBe(1);
  });

  it('is pinned by default and inline with fixed off', () => {
    const { fixture, host, bar } = setup();
    expect(bar.classList).toContain('ui-tab-bar--fixed');
    host.fixed.set(false);
    fixture.detectChanges();
    expect(bar.classList).not.toContain('ui-tab-bar--fixed');
  });

  it('throws in dev mode for more than four items (five slots with Add)', () => {
    expect(() => {
      const { fixture, host } = setup();
      host.items.set([...ITEMS, { id: 'more', label: 'More', icon: 'menu' }]);
      fixture.detectChanges();
      TestBed.tick();
    }).toThrow(/at most 4 items/);
  });

  it('draws a glass bar, 68px tall with 26px corners, fixed 16px / 20px plus the safe area, at most 560px wide', () => {
    const css = compileScss('lib/components/tab-bar/tab-bar.component.scss');
    expect(css).toContain('background: var(--glass)');
    expect(css).toContain('border: 1px solid var(--glass-line)');
    expect(css).toContain('block-size: 4.25rem');
    expect(css).toContain('border-radius: 1.625rem');
    // 16px from the sides on a phone; centred and at most 560px wide on a tablet (#316).
    expect(css).toContain('inset-inline: max(var(--space-4), (100vw - 35rem) / 2)');
    expect(css).toContain('env(safe-area-inset-bottom, 0rem)');
    expect(css).toContain('inline-size: 3.5rem');
    expect(css).toContain('border-radius: 1.25rem');
    expect(css).toContain('background: var(--primary)');
  });

  it('keeps tabs at least 44px high and shows hover only on hover-capable pointers', () => {
    const css = compileScss('lib/components/tab-bar/tab-bar.component.scss');
    expect(css).toContain('block-size: 3.25rem');
    expect(css).toContain('min-inline-size: 3.5rem');
    expect(withoutMedia(css, /hover: hover/)).not.toContain(':hover');
    expect(mediaBlocks(css, /hover: hover/).join('')).toContain(':hover');
  });

  it('has no axe violations', async () => {
    const { root } = setup();
    expect(await axeViolations(root)).toEqual([]);
  });
});
