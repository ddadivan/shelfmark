import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PIN_KIND } from '@shelfmark/contracts';
import axe from 'axe-core';
import { PinsStore } from '../../../stores/pins.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { MockFoldersApi } from '../../links/mock/mock-folders.api';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockLinksApi } from '../../links/mock/mock-links.api';
import { MockTagsApi } from '../../links/mock/mock-tags.api';
import { FOLDERS_API } from '../../links/models/folders-api.const';
import { LINKS_API } from '../../links/models/links-api.const';
import { TAGS_API } from '../../links/models/tags-api.const';
import { MockPinsApi } from '../mock/mock-pins.api';
import { PINS_API } from '../models/pins-api.const';
import { SidebarPinnedComponent } from './sidebar-pinned.component';

async function setup(pinned: 'none' | 'both' = 'both') {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([]),
      { provide: PINS_API, useClass: MockPinsApi },
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: LINKS_API, useClass: MockLinksApi },
      { provide: TAGS_API, useClass: MockTagsApi },
    ],
  });
  await loadEnglish();
  const data = TestBed.inject(MockLibraryData);
  const pins = TestBed.inject(PinsStore);
  if (pinned === 'both') {
    await pins.pin({ kind: PIN_KIND.Folder, id: data.foldersView()[0].id });
    await pins.pin({ kind: PIN_KIND.Link, id: data.links[0].id });
  }
  const fixture = TestBed.createComponent(SidebarPinnedComponent);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, pins, data };
}

function items(element: HTMLElement): HTMLElement[] {
  return [...element.querySelectorAll<HTMLElement>('.pinned__item')];
}

async function openMenu(element: HTMLElement, index: number): Promise<void> {
  items(element)[index].querySelector<HTMLButtonElement>('.pinned__more button')?.click();
  await vi.waitFor(() => {
    TestBed.tick();
    expect(document.querySelector('[role="menu"]')).not.toBeNull();
  });
}

function menuItem(label: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((item) =>
    item.textContent?.includes(label),
  );
  if (!found) {
    throw new Error(`no menu item ${label}`);
  }
  return found;
}

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container > *').forEach((node) => node.remove());
});

describe('SidebarPinnedComponent', () => {
  it('ends a pinned link row with a decorative pin glyph, a folder row with none', async () => {
    const { element } = await setup();
    const [folderRow, linkRow] = items(element);

    expect(folderRow.querySelector('.pinned__pin')).toBeNull();
    const glyph = linkRow.querySelector('.pinned__pin');
    expect(glyph?.getAttribute('name')).toBe('pin');
    expect(glyph?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders nothing while nothing is pinned', async () => {
    const { element } = await setup('none');

    expect(element.querySelector('.pinned')).toBeNull();
  });

  it('lists pinned folders and links in order under a Pinned heading', async () => {
    const { element, data } = await setup();

    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Pinned');
    const rows = items(element);
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain(data.foldersView()[0].name);
    expect(rows[1].textContent).toContain(data.links[0].title);
  });

  it('has no "Move up" / "Move down" in the item menu any more (#314)', async () => {
    const { element } = await setup();
    await openMenu(element, 0);
    const labels = [...document.querySelectorAll('[role="menuitem"]')].map((item) =>
      item.textContent?.trim(),
    );
    expect(labels).not.toContain('Move up');
    expect(labels).not.toContain('Move down');
  });

  it('moves the focused row with Alt+ArrowDown / Alt+ArrowUp, announces it and keeps focus', async () => {
    const { element, fixture, pins } = await setup();
    const announce = vi.spyOn(TestBed.inject(LiveAnnouncer), 'announce');
    const link = () => items(element)[0].querySelector<HTMLElement>('.pinned__link');
    const press = (target: HTMLElement | null, key: string) => {
      const event = new KeyboardEvent('keydown', {
        key,
        altKey: true,
        bubbles: true,
        cancelable: true,
      });
      target?.dispatchEvent(event);
      return event;
    };

    link()?.focus();
    const down = press(link(), 'ArrowDown');
    expect(down.defaultPrevented).toBe(true);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(pins.rows().map((row) => row.kind)).toEqual([PIN_KIND.Link, PIN_KIND.Folder]);
    });
    expect(announce).toHaveBeenLastCalledWith('Moved down, position 2 of 2', 'polite');
    await vi.waitFor(() => {
      TestBed.tick();
      expect(document.activeElement).toBe(items(element)[1].querySelector('.pinned__link'));
    });

    press(items(element)[1].querySelector<HTMLElement>('.pinned__link'), 'ArrowUp');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(pins.rows().map((row) => row.kind)).toEqual([PIN_KIND.Folder, PIN_KIND.Link]);
    });
    expect(announce).toHaveBeenLastCalledWith('Moved up, position 1 of 2', 'polite');
  });

  it('does nothing past the ends, from the "..." button or without Alt', async () => {
    const { element, pins } = await setup();
    const first = items(element)[0];
    const fire = (target: Element | null, init: KeyboardEventInit) =>
      target?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
      );
    fire(first.querySelector('.pinned__link'), { key: 'ArrowUp', altKey: true });
    fire(first.querySelector('.pinned__link'), { key: 'ArrowDown' });
    fire(first.querySelector('.pinned__more button'), { key: 'ArrowDown', altKey: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pins.rows().map((row) => row.kind)).toEqual([PIN_KIND.Folder, PIN_KIND.Link]);
  });

  it('unpins from the menu', async () => {
    const { element, fixture, pins } = await setup();

    await openMenu(element, 0);
    menuItem('Unpin').click();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(pins.rows().map((row) => row.kind)).toEqual([PIN_KIND.Link]);
    });
  });

  it('has no axe violations', async () => {
    const { element } = await setup();
    document.body.appendChild(element);

    const result = await axe.run(element);

    expect(result.violations).toEqual([]);
    element.remove();
  });
});
