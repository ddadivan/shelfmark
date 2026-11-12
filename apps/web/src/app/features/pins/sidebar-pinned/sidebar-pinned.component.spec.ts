import { LiveAnnouncer } from '@angular/cdk/a11y';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { PIN_KIND } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import axe from 'axe-core';
import { ViewportService } from '../../../core/layout/viewport.service';
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

// Toasts are ToastService's own business (and need its overlay region): here only what is asked.
const toastShow = vi.fn<ToastService['show']>();

async function setup(
  pinned: 'none' | 'both' = 'both',
  { card = false, phone = false }: { card?: boolean; phone?: boolean } = {},
) {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([]),
      { provide: PINS_API, useClass: MockPinsApi },
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: LINKS_API, useClass: MockLinksApi },
      { provide: TAGS_API, useClass: MockTagsApi },
      { provide: ToastService, useValue: { show: toastShow } },
      { provide: ViewportService, useValue: { phone: signal(phone) } },
    ],
  });
  await loadEnglish();
  const data = TestBed.inject(MockLibraryData);
  const pins = TestBed.inject(PinsStore);
  await pins.load();
  if (pinned === 'both') {
    await pins.pin({ kind: PIN_KIND.Folder, id: data.foldersView()[0].id });
    await pins.pin({ kind: PIN_KIND.Link, id: data.links[0].id });
  }
  const fixture = TestBed.createComponent(SidebarPinnedComponent);
  fixture.componentRef.setInput('card', card);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, pins, data };
}

function items(element: HTMLElement): HTMLElement[] {
  return [...element.querySelectorAll<HTMLElement>('.pinned__item')];
}

afterEach(() => {
  toastShow.mockReset();
  document.querySelectorAll('.cdk-overlay-container > *').forEach((node) => node.remove());
});

describe('SidebarPinnedComponent', () => {
  it('shows no pin glyph on a pinned row: Unpin on hover already says it (#314)', async () => {
    const { element } = await setup();

    expect(element.querySelector('.pinned__link ui-icon[name="pin"]')).toBeNull();
  });

  it('renders nothing while nothing is pinned', async () => {
    const { element } = await setup('none');

    expect(element.querySelector('.pinned')).toBeNull();
  });

  it('keeps hiding an empty section in the desktop sidebar, even as a card off the phone', async () => {
    const { element } = await setup('none', { card: true, phone: false });

    expect(element.querySelector('.pinned')).toBeNull();
    expect(element.classList).not.toContain('pinned--card');
  });

  it('keeps the Pinned section on the phone Library page with a quiet empty row (#315)', async () => {
    const { element } = await setup('none', { card: true, phone: true });

    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Pinned');
    expect(element.classList).toContain('pinned--card');
    const empty = element.querySelector<HTMLElement>('.pinned__empty');
    expect(empty?.textContent?.trim()).toBe('Nothing pinned yet');
    expect(empty?.querySelector('ui-icon use')?.getAttribute('href')).toMatch(/#sm-pin$/);
    expect(element.querySelector('.pinned__list')).toBeNull();
  });

  it('explains how to pin in a toast when the empty row is tapped', async () => {
    const { element } = await setup('none', { card: true, phone: true });

    element.querySelector<HTMLButtonElement>('.pinned__empty button')?.click();

    expect(toastShow).toHaveBeenCalledWith({
      kind: TOAST_KIND.Info,
      title: 'Nothing pinned yet — use “Pin to sidebar” in a folder or link menu',
    });
  });

  it('drops the empty row once something is pinned', async () => {
    const { element, fixture, pins, data } = await setup('none', { card: true, phone: true });

    await pins.pin({ kind: PIN_KIND.Folder, id: data.foldersView()[0].id });
    await fixture.whenStable();

    expect(element.querySelector('.pinned__empty')).toBeNull();
    expect(items(element)).toHaveLength(1);
  });

  it('has no axe violations with the empty row', async () => {
    const { element } = await setup('none', { card: true, phone: true });
    document.body.appendChild(element);

    const result = await axe.run(element);

    expect(result.violations).toEqual([]);
    element.remove();
  });

  it('lists pinned folders and links in order under a Pinned heading', async () => {
    const { element, data } = await setup();

    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Pinned');
    const rows = items(element);
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain(data.foldersView()[0].name);
    expect(rows[1].textContent).toContain(data.links[0].title);
  });

  it('has no "…" menu: Unpin is the only row action (#314)', async () => {
    const { element } = await setup();
    const row = items(element)[0];
    expect(row.querySelectorAll('ui-button')).toHaveLength(1);
    expect(row.querySelector('.pinned__unpin')).not.toBeNull();
    expect(element.querySelector('[aria-haspopup="menu"]')).toBeNull();
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

  it('does nothing past the ends, from the Unpin button or without Alt', async () => {
    const { element, pins } = await setup();
    const first = items(element)[0];
    const fire = (target: Element | null, init: KeyboardEventInit) =>
      target?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
      );
    fire(first.querySelector('.pinned__link'), { key: 'ArrowUp', altKey: true });
    fire(first.querySelector('.pinned__link'), { key: 'ArrowDown' });
    fire(first.querySelector('.pinned__unpin button'), { key: 'ArrowDown', altKey: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pins.rows().map((row) => row.kind)).toEqual([PIN_KIND.Folder, PIN_KIND.Link]);
  });

  it('unpins from the row\'s "Unpin" button with an Undo toast that puts it back in place', async () => {
    const { element, fixture, pins, data } = await setup();
    const show = toastShow;
    const button = items(element)[0].querySelector<HTMLButtonElement>('.pinned__unpin button');
    expect(button?.getAttribute('aria-label')).toBe(`Unpin ${data.foldersView()[0].name}`);
    expect(items(element)[0].querySelector('.pinned__unpin use')?.getAttribute('href')).toMatch(
      /#sm-pin-off$/,
    );

    button?.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(pins.rows().map((row) => row.kind)).toEqual([PIN_KIND.Link]);
    });
    await vi.waitFor(() => expect(show).toHaveBeenCalled());
    const toast = show.mock.lastCall?.[0];
    expect(toast?.title).toBe('Unpinned from sidebar');
    expect(toast?.detail).toBe(data.foldersView()[0].name);
    expect(toast?.action?.label).toBe('Undo');

    toast?.action?.run();
    // Pinned again (a mock round trip), then moved back to the first place (another one).
    await vi.waitFor(
      () => {
        fixture.detectChanges();
        expect(pins.rows().map((row) => row.kind)).toEqual([PIN_KIND.Folder, PIN_KIND.Link]);
      },
      { timeout: 5000 },
    );
  });

  it('draws the reorder line while a row drags over another place and clears it on drop (#315)', async () => {
    const { fixture, element } = await setup();
    const list = fixture.debugElement.query(By.css('.pinned__list'));
    const ul = list.nativeElement as HTMLElement;
    const placeholder = items(element)[0];
    const event = {
      container: { element: { nativeElement: ul } },
      item: { getPlaceholderElement: () => placeholder },
      previousIndex: 0,
    };

    list.triggerEventHandler('cdkDropListSorted', { ...event, currentIndex: 1 });
    expect(ul.classList).toContain('ui-drop-line--shown');
    expect(ul.style.getPropertyValue('--ui-drop-line-top')).toMatch(/px$/);

    list.triggerEventHandler('cdkDropListSorted', { ...event, currentIndex: 0 });
    expect(ul.classList).not.toContain('ui-drop-line--shown');

    list.triggerEventHandler('cdkDropListSorted', { ...event, currentIndex: 1 });
    list.triggerEventHandler('cdkDropListDropped', { ...event, currentIndex: 0 });
    expect(ul.classList).not.toContain('ui-drop-line--shown');
  });

  it('has no axe violations', async () => {
    const { element } = await setup();
    document.body.appendChild(element);

    const result = await axe.run(element);

    expect(result.violations).toEqual([]);
    element.remove();
  });
});
