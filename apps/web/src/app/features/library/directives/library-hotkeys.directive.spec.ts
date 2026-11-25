import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of } from 'rxjs';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { LINKS_API } from '../../links/models/links-api.const';
import type { LinksApi } from '../../links/models/links-api.interface';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { LinkActionsService } from '../../links/services/link-actions.service';
import { FEED_MEMORY_STORAGE_KEY } from '../models/feed-memory-storage-key.const';
import { LibraryFeedService } from '../services/library-feed.service';
import { LibraryFilterService } from '../services/library-filter.service';
import { LibraryFolderService } from '../services/library-folder.service';
import { LibrarySelectionService } from '../services/library-selection.service';
import { LibraryHotkeysDirective } from './library-hotkeys.directive';
import { LinkPreviewService } from '../../link-preview/services/link-preview.service';

const link = (n: number): LinkResponse => ({ ...MOCK_LINKS[0], id: `id-${n}`, title: `Link ${n}` });
const page = (items: LinkResponse[]): ListLinksResponse => ({
  items,
  nextCursor: null,
  pinned: [],
});

/** The link preview as the directive sees it: `split` turns the preview keys on. */
const previewStub = {
  split: signal(false),
  currentId: signal<string | null>(null),
  go: vi.fn<(step: -1 | 1) => Promise<void>>(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve()),
  openInNewTab: vi.fn(),
  fullScreen: signal(false),
  toggleFullScreen: vi.fn(),
  exitFullScreen: vi.fn(),
};

@Component({
  selector: 'app-hotkeys-host',
  imports: [LibraryHotkeysDirective],
  providers: [
    LibraryFilterService,
    LibraryFeedService,
    LibrarySelectionService,
    { provide: LinkPreviewService, useValue: previewStub },
  ],
  template: '<div appLibraryHotkeys></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {}

async function setup() {
  const api = {
    list: vi.fn<LinksApi['list']>(() => of(page([link(1), link(2), link(3)]))),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
  };
  const actions = { addLink: vi.fn(() => Promise.resolve()) };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: api },
      { provide: LinkActionsService, useValue: actions },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(HostComponent);
  const injector = fixture.debugElement.injector;
  injector.get(LibraryFilterService).connect({
    scope: signal(LINKS_SCOPE.All),
    folderId: signal(undefined),
    tag: signal(undefined),
    q: signal(undefined),
    sort: signal(undefined),
    kind: signal(undefined),
  });
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, selection: injector.get(LibrarySelectionService), actions };
}

function key(init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  document.body.dispatchEvent(event);
  return event;
}

function paste(text: string): Event {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
  document.body.dispatchEvent(event);
  return event;
}

describe('LibraryHotkeysDirective F2', () => {
  async function setupFolder(folder: object | null) {
    const rename = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoForTest(),
        {
          provide: LINKS_API,
          useValue: { list: () => of(page([link(1)])), recent: () => of({ items: [] }) },
        },
        { provide: LinkActionsService, useValue: { addLink: vi.fn() } },
      ],
    });
    TestBed.overrideComponent(HostComponent, {
      add: {
        providers: [{ provide: LibraryFolderService, useValue: { folder: () => folder, rename } }],
      },
    });
    await loadEnglish();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.debugElement.injector.get(LibraryFilterService).connect({
      scope: signal(LINKS_SCOPE.All),
      folderId: signal(undefined),
      tag: signal(undefined),
      q: signal(undefined),
      sort: signal(undefined),
      kind: signal(undefined),
    });
    fixture.detectChanges();
    await fixture.whenStable();
    return rename;
  }

  it('renames the folder of a folder page', async () => {
    const rename = await setupFolder({ id: 'f1' });
    const press = key({ key: 'F2' });
    expect(press.defaultPrevented).toBe(true);
    expect(rename).toHaveBeenCalledOnce();
  });

  it('does nothing outside a folder page', async () => {
    const rename = await setupFolder(null);
    key({ key: 'F2' });
    expect(rename).not.toHaveBeenCalled();
  });
});

describe('LibraryHotkeysDirective', () => {
  beforeEach(() => {
    localStorage.removeItem(FEED_MEMORY_STORAGE_KEY);
    previewStub.split.set(false);
    previewStub.currentId.set(null);
    previewStub.go.mockClear();
    previewStub.close.mockClear();
    previewStub.openInNewTab.mockClear();
    previewStub.fullScreen.set(false);
    previewStub.toggleFullScreen.mockClear();
    previewStub.exitFullScreen.mockClear();
  });
  afterAll(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));

  it('selects every link on screen with Ctrl+A and ends the selection with Esc', async () => {
    const { selection } = await setup();
    const selectAll = key({ key: 'a', code: 'KeyA', ctrlKey: true });
    expect(selectAll.defaultPrevented).toBe(true);
    expect(selection.selectedCount()).toBe(3);

    key({ key: 'Escape' });
    expect(selection.selecting()).toBe(false);
  });

  it('starts selecting with X, nothing picked yet (Shelf "Select links")', async () => {
    const { selection } = await setup();
    const press = key({ key: 'x', code: 'KeyX' });
    expect(press.defaultPrevented).toBe(true);
    expect(selection.selecting()).toBe(true);
    expect(selection.selectedCount()).toBe(0);
    key({ key: 'Escape' });
    expect(selection.selecting()).toBe(false);
  });

  it('leaves the keys of a text field alone', async () => {
    const { selection } = await setup();
    const input = document.createElement('input');
    document.body.append(input);
    const event = new KeyboardEvent('keydown', {
      key: 'a',
      code: 'KeyA',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(selection.selecting()).toBe(false);
    input.remove();
  });

  it('opens Add link with a pasted link and ignores text without one', async () => {
    const { actions } = await setup();
    expect(paste('just some words').defaultPrevented).toBe(false);
    expect(actions.addLink).not.toHaveBeenCalled();

    expect(paste('https://example.com/a').defaultPrevented).toBe(true);
    expect(actions.addLink).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'https://example.com/a' }),
    );
  });

  describe('link preview keys (#553)', () => {
    it('moves to the next and previous link with the arrows while the split is open', async () => {
      await setup();
      previewStub.split.set(true);
      expect(key({ key: 'ArrowDown' }).defaultPrevented).toBe(true);
      expect(previewStub.go).toHaveBeenLastCalledWith(1);
      key({ key: 'ArrowUp' });
      expect(previewStub.go).toHaveBeenLastCalledWith(-1);
    });

    it('closes the preview with Esc', async () => {
      await setup();
      previewStub.split.set(true);
      expect(key({ key: 'Escape' }).defaultPrevented).toBe(true);
      expect(previewStub.close).toHaveBeenCalledTimes(1);
    });

    it('toggles full screen with F, also on another keyboard layout, but not while typing', async () => {
      await setup();
      previewStub.split.set(true);
      expect(key({ key: 'f', code: 'KeyF' }).defaultPrevented).toBe(true);
      key({ key: 'а', code: 'KeyF' });
      expect(previewStub.toggleFullScreen).toHaveBeenCalledTimes(2);
      key({ key: 'f', code: 'KeyF', metaKey: true });
      const input = document.createElement('input');
      document.body.append(input);
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'f', code: 'KeyF', bubbles: true, cancelable: true }),
      );
      input.remove();
      expect(previewStub.toggleFullScreen).toHaveBeenCalledTimes(2);
    });

    it('leaves full screen with the first Esc and closes with the next', async () => {
      await setup();
      previewStub.split.set(true);
      previewStub.fullScreen.set(true);
      expect(key({ key: 'Escape' }).defaultPrevented).toBe(true);
      expect(previewStub.exitFullScreen).toHaveBeenCalledTimes(1);
      expect(previewStub.close).not.toHaveBeenCalled();
      previewStub.fullScreen.set(false);
      key({ key: 'Escape' });
      expect(previewStub.close).toHaveBeenCalledTimes(1);
    });

    it('opens the previewed link in a new tab with Enter on the page', async () => {
      await setup();
      previewStub.split.set(true);
      expect(key({ key: 'Enter' }).defaultPrevented).toBe(true);
      expect(previewStub.openInNewTab).toHaveBeenCalledTimes(1);
    });

    it('leaves the keys alone while no split preview is open', async () => {
      await setup();
      const events = [key({ key: 'ArrowDown' }), key({ key: 'Escape' }), key({ key: 'Enter' })];
      expect(events.map((event) => event.defaultPrevented)).toEqual([false, false, false]);
      expect(previewStub.go).not.toHaveBeenCalled();
      expect(previewStub.close).not.toHaveBeenCalled();
      expect(previewStub.openInNewTab).not.toHaveBeenCalled();
    });

    it('ends a selection with Esc before it closes the preview', async () => {
      const { selection } = await setup();
      previewStub.split.set(true);
      key({ key: 'a', code: 'KeyA', ctrlKey: true });
      expect(selection.selecting()).toBe(true);
      key({ key: 'Escape' });
      expect(selection.selecting()).toBe(false);
      expect(previewStub.close).not.toHaveBeenCalled();
    });

    it('does not take the arrows in a text field', async () => {
      await setup();
      previewStub.split.set(true);
      const input = document.createElement('input');
      document.body.append(input);
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);
      input.remove();
      expect(event.defaultPrevented).toBe(false);
      expect(previewStub.go).not.toHaveBeenCalled();
    });

    it('moves the focus to the link now previewed after an arrow on a feed link', async () => {
      const { fixture } = await setup();
      previewStub.split.set(true);
      const area: HTMLElement = fixture.nativeElement.querySelector('[appLibraryHotkeys]');
      const item = (id: string) => {
        const wrapper = document.createElement('div');
        wrapper.dataset['linkId'] = id;
        const anchor = document.createElement('a');
        anchor.className = 'ui-card__link';
        anchor.href = `https://example.com/${id}`;
        wrapper.append(anchor);
        area.append(wrapper);
        return anchor;
      };
      const first = item('id-1');
      const second = item('id-2');
      // jsdom has no scrollIntoView.
      const scrolled = vi.fn();
      second.scrollIntoView = scrolled;
      document.body.append(area);
      previewStub.go.mockImplementation(() => {
        previewStub.currentId.set('id-2');
        return Promise.resolve();
      });
      first.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      );
      await vi.waitFor(() => expect(document.activeElement).toBe(second));
      expect(scrolled).toHaveBeenCalledWith({ block: 'nearest' });
      previewStub.go.mockImplementation(() => Promise.resolve());
      area.remove();
    });
  });
});
