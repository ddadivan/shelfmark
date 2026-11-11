import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService } from '@shelfmark/ui';
import { of } from 'rxjs';
import { BulkLinkActionsService } from '../links/bulk/bulk-link-actions.service';
import { LINKS_API } from '../links/models/links-api.const';
import type { LinksApi } from '../links/models/links-api.interface';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import { LinkSelectionStore } from '../../stores/link-selection.store';
import { UI_STORAGE_KEY } from '../../stores/models/ui-storage-key.const';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import LibraryPage from './library.page';

function link(n: number): LinkResponse {
  return { ...MOCK_LINKS[0], id: `id-${n}`, title: `Link ${n}`, isFavorite: n === 2 };
}

const page = (items: LinkResponse[]): ListLinksResponse => ({
  items,
  nextCursor: null,
  pinned: [],
});

async function setup() {
  const api = {
    list: vi.fn<LinksApi['list']>(() => of(page([link(1), link(2), link(3), link(4)]))),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
  };
  const bulk = {
    canShare: () => false,
    move: vi.fn(() => Promise.resolve(true)),
    editTags: vi.fn(() => Promise.resolve(false)),
    toggleFavorite: vi.fn(() => Promise.resolve(false)),
    openAll: vi.fn(() => Promise.resolve(false)),
    copy: vi.fn(() => Promise.resolve(false)),
    share: vi.fn(() => Promise.resolve(false)),
    delete: vi.fn(() => Promise.resolve(true)),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: api },
      { provide: DialogService, useValue: { confirm: vi.fn(() => Promise.resolve(false)) } },
      { provide: BulkLinkActionsService, useValue: bulk },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(LibraryPage);
  fixture.componentRef.setInput('scope', LINKS_SCOPE.All);
  document.body.appendChild(fixture.nativeElement as HTMLElement);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, bulk, selection: TestBed.inject(LinkSelectionStore) };
}

async function stable(fixture: ComponentFixture<LibraryPage>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
}

const boxes = (element: HTMLElement) => [
  ...element.querySelectorAll<HTMLElement>('app-link-card ui-checkbox'),
];
const selectedText = (element: HTMLElement) =>
  element.querySelector('.library__selected')?.textContent?.trim();
const barButton = (element: HTMLElement, name: string) =>
  [...element.querySelectorAll<HTMLButtonElement>('.ui-bulk-bar__action')].find(
    (button) => button.textContent?.trim() === name,
  );

function key(init: KeyboardEventInit, target: EventTarget = document.body): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe('LibraryPage selection', () => {
  beforeEach(() => localStorage.removeItem(UI_STORAGE_KEY));
  afterEach(() => document.body.replaceChildren());

  it('shows no header or bar until a link is picked', async () => {
    const { element } = await setup();
    expect(element.querySelector('.library__selection')).toBeNull();
    expect(element.querySelector('ui-bulk-bar')).toBeNull();
    expect(boxes(element)).toHaveLength(4);
  });

  it('a checkbox click selects, Shift extends the range, and the header and bar show', async () => {
    const { element, fixture } = await setup();
    boxes(element)[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await stable(fixture);
    expect(selectedText(element)).toBe('1 selected');
    boxes(element)[2]?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }),
    );
    await stable(fixture);
    expect(selectedText(element)).toBe('3 selected');
    expect(element.querySelectorAll('ui-card.ui-card--checked')).toHaveLength(3);
    expect(element.querySelector('ui-bulk-bar [role="toolbar"]')?.getAttribute('aria-label')).toBe(
      'Actions for 3 selected links',
    );
    expect(
      [...element.querySelectorAll('.library__hint')].map((hint) => hint.textContent?.trim()),
    ).toEqual(['Shift + click selects a range', 'Esc clears']);
    expect(
      [...element.querySelectorAll('.ui-bulk-bar__action')].map((b) => b.textContent?.trim()),
    ).toEqual(['Move', 'Tags', 'Favorite', 'Open all', 'Copy links', 'Delete']);
  });

  it('a click on a card while selecting toggles it and does not navigate', async () => {
    const { element, fixture, selection } = await setup();
    selection.toggle('id-1', ['id-1']);
    await stable(fixture);
    const title = element.querySelectorAll<HTMLElement>('.ui-card__link')[1];
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    title?.dispatchEvent(click);
    await stable(fixture);
    expect(click.defaultPrevented).toBe(true);
    expect(selectedText(element)).toBe('2 selected');
  });

  it('Cmd/Ctrl+A selects all, Esc clears; both leave text fields alone', async () => {
    const { element, fixture } = await setup();
    const input = document.createElement('input');
    document.body.append(input);
    const inField = key({ key: 'a', ctrlKey: true }, input);
    expect(inField.defaultPrevented).toBe(false);

    const all = key({ key: 'a', metaKey: true });
    await stable(fixture);
    expect(all.defaultPrevented).toBe(true);
    expect(selectedText(element)).toBe('4 selected');

    key({ key: 'Escape' }, input);
    await stable(fixture);
    expect(selectedText(element)).toBe('4 selected');
    key({ key: 'Escape' });
    await stable(fixture);
    expect(element.querySelector('.library__selection')).toBeNull();
  });

  it('Space on a focused card toggles it, M asks to move it', async () => {
    const { element, fixture, bulk } = await setup();
    const title = element.querySelectorAll<HTMLElement>('.ui-card__link')[0] as HTMLElement;
    key({ key: ' ' }, title);
    await stable(fixture);
    expect(selectedText(element)).toBe('1 selected');
    expect(bulk.move).not.toHaveBeenCalled();
  });

  it('"Select all" and the header checkbox pick every link; Done clears', async () => {
    const { element, fixture, selection } = await setup();
    selection.toggle('id-1', ['id-1']);
    await stable(fixture);
    const selectAll = [
      ...element.querySelectorAll<HTMLButtonElement>('.library__selection button'),
    ].find((button) => button.textContent?.trim() === 'Select all 4');
    selectAll?.click();
    await stable(fixture);
    expect(selectedText(element)).toBe('4 selected');
    const done = [
      ...element.querySelectorAll<HTMLButtonElement>('.library__selection button'),
    ].find((button) => button.textContent?.trim() === 'Done');
    done?.click();
    await stable(fixture);
    expect(selection.count()).toBe(0);
  });

  it('runs the bar actions with the picked links and clears after move and delete', async () => {
    const { element, fixture, bulk, selection } = await setup();
    selection.selectAll(['id-1', 'id-2']);
    await stable(fixture);
    expect(barButton(element, 'Favorite')?.getAttribute('aria-pressed')).toBe('false');

    for (const name of ['Tags', 'Favorite', 'Open all', 'Copy links']) {
      barButton(element, name)?.click();
      await stable(fixture);
    }
    expect(bulk.editTags).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'id-1' }),
      expect.objectContaining({ id: 'id-2' }),
    ]);
    expect(bulk.toggleFavorite).toHaveBeenCalled();
    expect(bulk.openAll).toHaveBeenCalled();
    expect(bulk.copy).toHaveBeenCalled();
    expect(selection.count()).toBe(2);

    barButton(element, 'Move')?.click();
    await stable(fixture);
    expect(bulk.move).toHaveBeenCalled();
    expect(selection.count()).toBe(0);

    selection.selectAll(['id-3']);
    await stable(fixture);
    barButton(element, 'Delete')?.click();
    await stable(fixture);
    expect(bulk.delete).toHaveBeenCalledWith([expect.objectContaining({ id: 'id-3' })]);
    expect(selection.count()).toBe(0);
  });

  it('presses Favorite when every picked link is a favorite', async () => {
    const { element, fixture, selection } = await setup();
    selection.selectAll(['id-2']);
    await stable(fixture);
    expect(barButton(element, 'Favorite')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('clears the selection when the view changes', async () => {
    const { fixture, selection } = await setup();
    selection.selectAll(['id-1']);
    await stable(fixture);
    fixture.componentRef.setInput('scope', LINKS_SCOPE.Favorites);
    await stable(fixture);
    expect(selection.count()).toBe(0);
  });
});
