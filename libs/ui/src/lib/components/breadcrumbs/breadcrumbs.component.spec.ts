import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { BreadcrumbsComponent } from './breadcrumbs.component';
import { breadcrumbTrail } from './breadcrumbs-trail';
import type { BreadcrumbClick } from './models/breadcrumb-click.interface';
import type { BreadcrumbItem } from './models/breadcrumb-item.interface';

const SHORT: BreadcrumbItem[] = [
  { label: 'All links', href: '/' },
  { label: 'Work', href: '/f/work' },
  { label: 'Angular' },
];
const DEEP: BreadcrumbItem[] = [
  { label: 'All links', href: '/' },
  { label: 'Work', href: '/f/work' },
  { label: 'Clients', href: '/f/clients' },
  { label: 'Acme', href: '/f/acme' },
  { label: 'Design', href: '/f/design' },
  { label: 'Angular' },
];

@Component({
  imports: [BreadcrumbsComponent],
  template: `
    <ui-breadcrumbs
      [items]="items()"
      ariaLabel="Breadcrumb"
      collapsedLabel="Show hidden folders"
      [maxItems]="maxItems()"
      (linkClick)="clicks.push($event)"
    />
  `,
})
class HostComponent {
  readonly items = signal<readonly BreadcrumbItem[]>(SHORT);
  readonly maxItems = signal(4);
  readonly clicks: BreadcrumbClick[] = [];
}

function mockPhone(phone: boolean): { change: (matches: boolean) => void } {
  let listener: ((event: MediaQueryListEvent) => void) | undefined;
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: phone && query.includes('width < 40em'),
    media: query,
    addEventListener: (_type: string, fn: (event: MediaQueryListEvent) => void) => {
      if (query.includes('width < 40em')) {
        listener = fn;
      }
    },
    removeEventListener: () => undefined,
  }));
  return {
    change: (matches) => listener?.({ matches } as MediaQueryListEvent),
  };
}

function setup(items: readonly BreadcrumbItem[] = SHORT, phone = false) {
  const media = mockPhone(phone);
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  fixture.componentInstance.items.set(items);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const labels = () =>
    [...root.querySelectorAll('.ui-crumbs__item')].map(
      (li) => li.querySelector('a, .ui-crumbs__current, button')?.textContent?.trim() || '…',
    );
  return { fixture, root, media, labels };
}

describe('BreadcrumbsComponent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is a named nav with an ordered list, links and a current page', () => {
    const { root } = setup();
    const nav = root.querySelector('nav') as HTMLElement;
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
    expect(nav.querySelector('ol')).toBeTruthy();
    const links = [...root.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/', '/f/work']);
    const current = root.querySelector('[aria-current="page"]') as HTMLElement;
    expect(current.textContent?.trim()).toBe('Angular');
    expect(current.tagName).toBe('SPAN');
    expect(root.querySelectorAll('[aria-current]')).toHaveLength(1);
  });

  it('hides the separators from assistive technology', () => {
    const { root } = setup();
    const seps = [...root.querySelectorAll('.ui-crumbs__sep')];
    expect(seps).toHaveLength(2);
    expect(seps.every((s) => s.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('shows every level up to maxItems', () => {
    const { labels, root } = setup();
    expect(labels()).toEqual(['All links', 'Work', 'Angular']);
    expect(root.querySelector('button')).toBeNull();
  });

  it('folds the middle levels into a "…" menu button', () => {
    const { labels, root } = setup(DEEP);
    expect(labels()).toEqual(['All links', '…', 'Design', 'Angular']);
    const button = root.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Show hidden folders');
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('honours maxItems', () => {
    const { fixture, labels } = setup(DEEP);
    fixture.componentInstance.maxItems.set(5);
    fixture.detectChanges();
    expect(labels()).toEqual(['All links', '…', 'Acme', 'Design', 'Angular']);
    fixture.componentInstance.maxItems.set(10);
    fixture.detectChanges();
    expect(labels()).toHaveLength(6);
  });

  it('opens the menu with the folded levels and emits the chosen one without an event', () => {
    const { fixture, root } = setup(DEEP);
    (root.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    TestBed.tick();
    const items = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    expect(items.map((i) => i.textContent?.trim())).toEqual(['Work', 'Clients', 'Acme']);
    items[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.clicks).toEqual([{ item: DEEP[2], event: null }]);
  });

  it('opens the menu with ArrowDown on the "…" button', () => {
    const { fixture, root } = setup(DEEP);
    (root.querySelector('button') as HTMLButtonElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: KEYBOARD_KEY.ArrowDown, bubbles: true }),
    );
    fixture.detectChanges();
    TestBed.tick();
    expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(3);
  });

  it('on a phone shows "…", the parent and the current level; the root joins the menu', () => {
    const { labels, root, fixture } = setup(DEEP, true);
    expect(labels()).toEqual(['…', 'Design', 'Angular']);
    (root.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    TestBed.tick();
    expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(4);
  });

  it('on a phone with two levels shows both, no "…"', () => {
    const { labels } = setup([{ label: 'Work', href: '/f/work' }, { label: 'Angular' }], true);
    expect(labels()).toEqual(['Work', 'Angular']);
  });

  it('follows the viewport when it crosses the phone breakpoint', () => {
    const { labels, media, fixture } = setup(DEEP);
    expect(labels()).toHaveLength(4);
    media.change(true);
    fixture.detectChanges();
    expect(labels()).toEqual(['…', 'Design', 'Angular']);
  });

  it('works without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('a')).toHaveLength(2);
  });

  it('emits linkClick for a plain click and lets the app prevent navigation', () => {
    const { fixture, root } = setup();
    const link = root.querySelector('a') as HTMLAnchorElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);
    expect(fixture.componentInstance.clicks).toHaveLength(1);
    expect(fixture.componentInstance.clicks[0].item).toEqual(SHORT[0]);
    expect(fixture.componentInstance.clicks[0].event).toBe(event);
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }])(
    'ignores a modified or non-primary click (%o)',
    (init) => {
      const { fixture, root } = setup();
      (root.querySelector('a') as HTMLAnchorElement).dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, ...init }),
      );
      expect(fixture.componentInstance.clicks).toHaveLength(0);
    },
  );

  it('gives a tooltip only to text that is cut', () => {
    const { fixture, root } = setup();
    const link = root.querySelector('a') as HTMLAnchorElement;
    Object.defineProperty(link, 'scrollWidth', { value: 300, configurable: true });
    Object.defineProperty(link, 'clientWidth', { value: 100, configurable: true });
    link.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    expect(link.getAttribute('aria-description')).toBeTruthy();
    Object.defineProperty(link, 'scrollWidth', { value: 50, configurable: true });
    link.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(link.getAttribute('aria-description')).toBeNull();
    const current = root.querySelector('.ui-crumbs__current') as HTMLElement;
    current.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    expect(current.getAttribute('aria-description')).toBeNull();
  });

  it('renders a level without href as a focusable button that emits linkClick', () => {
    const { fixture, root, labels } = setup([
      { label: 'Work' },
      { label: 'Clients', href: '/f/clients' },
      { label: 'Angular' },
    ]);
    expect(labels()).toEqual(['Work', 'Clients', 'Angular']);
    const button = root.querySelector('button.ui-crumbs__link') as HTMLButtonElement;
    expect(button.type).toBe('button');
    expect(button.tabIndex).toBe(0);
    expect(root.querySelectorAll('a')).toHaveLength(1);
    document.body.append(root);
    button.focus();
    expect(document.activeElement).toBe(button);
    button.click();
    expect(fixture.componentInstance.clicks[0].item.label).toBe('Work');
    root.remove();
  });

  it('measures a button for the tooltip too', () => {
    const { fixture, root } = setup([{ label: 'Work' }, { label: 'Angular' }]);
    const button = root.querySelector('button.ui-crumbs__link') as HTMLButtonElement;
    Object.defineProperty(button, 'scrollWidth', { value: 300, configurable: true });
    Object.defineProperty(button, 'clientWidth', { value: 100, configurable: true });
    button.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(button.getAttribute('aria-description')).toBeTruthy();
  });

  it('uses a large "…" button on a coarse pointer', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('pointer: coarse'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.items.set(DEEP);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.ui-button--lg')).toBeTruthy();
  });

  it('keeps links in the tab order', () => {
    const { root } = setup();
    expect([...root.querySelectorAll('a')].every((a) => a.tabIndex === 0)).toBe(true);
  });

  it.each([
    ['short trail', SHORT, false],
    ['collapsed', DEEP, false],
    ['phone', DEEP, true],
  ])('has no axe violations (%s)', async (_name, items, phone) => {
    expect(await axeViolations(setup(items, phone).root)).toEqual([]);
  });
});

describe('breadcrumbTrail', () => {
  it('never folds three levels or fewer, even with a tiny maxItems', () => {
    expect(breadcrumbTrail(SHORT, 1, false).hidden).toEqual([]);
  });

  it('keeps the root and the current level at the smallest maxItems', () => {
    const trail = breadcrumbTrail(DEEP, 2, false);
    expect(trail.entries.map((e) => e.kind)).toEqual(['link', 'collapsed', 'current']);
    expect(trail.hidden).toHaveLength(4);
  });
});
