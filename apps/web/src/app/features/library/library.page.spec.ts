import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService } from '@shelfmark/ui';
import axe from 'axe-core';
import { of, Subject, throwError } from 'rxjs';
import { LINKS_API } from '../links/models/links-api.const';
import type { LinksApi } from '../links/models/links-api.interface';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import { UI_STORAGE_KEY } from '../../stores/models/ui-storage-key.const';
import { UI_VIEW } from '../../stores/models/ui-view.const';
import { UiStore } from '../../stores/ui.store';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import LibraryPage from './library.page';

function link(n: number, changes: Partial<LinkResponse> = {}): LinkResponse {
  return {
    ...MOCK_LINKS[0],
    id: `id-${n}`,
    title: `Link ${n}`,
    url: `https://site${n}.example.com/a`,
    isFavorite: false,
    ...changes,
  };
}

function page(items: LinkResponse[], nextCursor: string | null = null): ListLinksResponse {
  return { items, nextCursor };
}

async function setup(first: Subject<ListLinksResponse> | null = null) {
  const api = {
    list: vi.fn<LinksApi['list']>(() => first ?? of(page([link(1), link(2)], 'c1'))),
    update: vi.fn<LinksApi['update']>((id) => of(link(Number(id.slice(3))))),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: api },
      { provide: DialogService, useValue: { confirm: vi.fn(() => Promise.resolve(false)) } },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(LibraryPage);
  fixture.componentRef.setInput('scope', LINKS_SCOPE.All);
  await fixture.whenStable();
  return { api, fixture, element: fixture.nativeElement as HTMLElement };
}

const text = (fixture: ComponentFixture<LibraryPage>) =>
  (fixture.nativeElement as HTMLElement).textContent ?? '';

describe('LibraryPage', () => {
  beforeEach(() => localStorage.removeItem(UI_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(UI_STORAGE_KEY));

  it('shows a skeleton and no cards while the first page loads', async () => {
    const { element } = await setup(new Subject<ListLinksResponse>());

    expect(element.querySelector('section')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('ui-skeleton')).not.toBeNull();
    expect(element.querySelector('app-link-card')).toBeNull();
  });

  it('shows the heading, the count and the cards, with more to load', async () => {
    const { element, fixture } = await setup();

    expect(element.querySelector('h1')?.textContent).toBe('All links');
    expect(text(fixture)).toContain('2+ links');
    expect(element.querySelectorAll('app-link-card')).toHaveLength(2);
    expect(element.querySelector('ui-skeleton')).toBeNull();
  });

  it('names the heading after the scope', async () => {
    const { fixture, element } = await setup();

    fixture.componentRef.setInput('scope', LINKS_SCOPE.Favorites);
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent).toBe('Favorites');
  });

  it('shows rows when the list view is chosen', async () => {
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ view: UI_VIEW.List }));
    const { element } = await setup();

    expect(element.querySelectorAll('app-link-row')).toHaveLength(2);
    expect(element.querySelector('app-link-card')).toBeNull();
  });

  it('switches the view with the segmented control and remembers it', async () => {
    const { element, fixture } = await setup();

    element.querySelector<HTMLInputElement>('input[type="radio"][value="list"]')?.click();
    await fixture.whenStable();

    expect(TestBed.inject(UiStore).view()).toBe(UI_VIEW.List);
    expect(element.querySelectorAll('app-link-row')).toHaveLength(2);
  });

  it('loads the next page from the visible button', async () => {
    const { api, element, fixture } = await setup();
    api.list.mockReturnValueOnce(of(page([link(3)])));

    [...element.querySelectorAll('ui-button')]
      .find((button) => button.textContent?.includes('Load more'))
      ?.querySelector('button')
      ?.click();
    await fixture.whenStable();

    expect(api.list).toHaveBeenLastCalledWith({ cursor: 'c1' });
    expect(element.querySelectorAll('app-link-card')).toHaveLength(3);
    expect(text(fixture)).toContain('3 links');
    expect(text(fixture)).not.toContain('Load more');
  });

  it('shows the empty state with an Add link action', async () => {
    const { api, element, fixture } = await setup();
    api.list.mockReturnValue(of(page([])));
    fixture.componentRef.setInput('scope', LINKS_SCOPE.Unsorted);
    await fixture.whenStable();

    expect(text(fixture)).toContain('No links here yet');
    expect(element.querySelector('ui-empty-state button')?.textContent).toContain('Add link');
  });

  it('shows the error state and retries', async () => {
    const { api, element, fixture } = await setup();
    api.list.mockReturnValue(throwError(() => new Error('boom')));
    fixture.componentRef.setInput('scope', LINKS_SCOPE.Favorites);
    await fixture.whenStable();
    expect(text(fixture)).toContain("Couldn't load your links");

    api.list.mockReturnValue(of(page([link(5)])));
    element.querySelector<HTMLButtonElement>('ui-empty-state button')?.click();
    await fixture.whenStable();

    expect(element.querySelectorAll('app-link-card')).toHaveLength(1);
    expect(text(fixture)).not.toContain("Couldn't load your links");
  });

  it('keeps showing the links when a refetch of the same scope fails', async () => {
    const { api, element, fixture } = await setup();
    api.list.mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance['retry']();
    await fixture.whenStable();

    expect(element.querySelectorAll('app-link-card')).toHaveLength(2);
  });

  it('toggles a favorite from a card', async () => {
    const { api, element, fixture } = await setup();

    element.querySelector<HTMLButtonElement>('button[aria-label="Favorite: Link 1"]')?.click();
    await fixture.whenStable();

    expect(api.update).toHaveBeenCalledWith('id-1', { isFavorite: true });
    expect(
      element.querySelector('button[aria-label="Favorite: Link 1"]')?.getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('has no axe violations', async () => {
    const { element } = await setup();
    document.body.append(element);

    const { violations } = await axe.run(element, {
      rules: { 'color-contrast': { enabled: false } },
    });
    element.remove();

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
});
