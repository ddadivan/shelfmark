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
import { LibrarySelectionService } from '../services/library-selection.service';
import { LibraryHotkeysDirective } from './library-hotkeys.directive';

const link = (n: number): LinkResponse => ({ ...MOCK_LINKS[0], id: `id-${n}`, title: `Link ${n}` });
const page = (items: LinkResponse[]): ListLinksResponse => ({
  items,
  nextCursor: null,
  pinned: [],
});

@Component({
  selector: 'app-hotkeys-host',
  imports: [LibraryHotkeysDirective],
  providers: [LibraryFilterService, LibraryFeedService, LibrarySelectionService],
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

describe('LibraryHotkeysDirective', () => {
  beforeEach(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));

  it('selects every link on screen with Ctrl+A and ends the selection with Esc', async () => {
    const { selection } = await setup();
    const selectAll = key({ key: 'a', code: 'KeyA', ctrlKey: true });
    expect(selectAll.defaultPrevented).toBe(true);
    expect(selection.selectedCount()).toBe(3);

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
});
