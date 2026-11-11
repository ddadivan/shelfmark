import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PIN_KIND } from '@shelfmark/contracts';
import { ToastService } from '@shelfmark/ui';
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

// Toasts are ToastService's own business (and need its overlay region): here only what is asked.
const toastShow = vi.fn<ToastService['show']>();

async function setup(pinned: 'none' | 'both' = 'both') {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([]),
      { provide: PINS_API, useClass: MockPinsApi },
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: LINKS_API, useClass: MockLinksApi },
      { provide: TAGS_API, useClass: MockTagsApi },
      { provide: ToastService, useValue: { show: toastShow } },
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

  it('has no axe violations', async () => {
    const { element } = await setup();
    document.body.appendChild(element);

    const result = await axe.run(element);

    expect(result.violations).toEqual([]);
    element.remove();
  });
});
