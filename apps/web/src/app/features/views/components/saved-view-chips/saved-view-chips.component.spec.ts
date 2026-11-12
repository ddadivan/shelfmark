import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LINK_KIND } from '@shelfmark/contracts';
import { axeViolations } from '../../../../../testing/axe';
import { SavedViewsStore } from '../../../../stores/saved-views.store';
import { FoldersStore } from '../../../../stores/folders.store';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { FOLDERS_API } from '../../../links/models/folders-api.const';
import { MockFoldersApi } from '../../../links/mock/mock-folders.api';
import type { LinksFilter } from '../../../links/models/links-filter.type';
import { LINKS_SCOPE } from '../../../links/models/links-scope.const';
import { MockSavedViewsApi } from '../../mock/mock-saved-views.api';
import { SAVED_VIEWS_API } from '../../models/saved-views-api.const';
import { SavedViewActionsService } from '../../services/saved-view-actions.service';
import { SavedViewChipsComponent } from './saved-view-chips.component';

@Component({
  imports: [SavedViewChipsComponent],
  template: `<app-saved-view-chips [filter]="filter()" />`,
})
class HostComponent {
  readonly filter = signal<LinksFilter>({ scope: LINKS_SCOPE.All });
}

async function setup() {
  const actions = {
    apply: vi.fn(() => Promise.resolve()),
    applyAll: vi.fn(() => Promise.resolve()),
    saveCurrent: vi.fn(() => Promise.resolve()),
    rename: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
    move: vi.fn(() => Promise.resolve()),
  };
  TestBed.configureTestingModule({
    imports: [HostComponent],
    providers: [
      provideTranslocoForTest(),
      provideRouter([]),
      { provide: SAVED_VIEWS_API, useClass: MockSavedViewsApi },
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: SavedViewActionsService, useValue: actions },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(HostComponent);
  document.body.appendChild(fixture.nativeElement as HTMLElement);
  const store = TestBed.inject(SavedViewsStore);
  await store.load();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const chips = () => [...element.querySelectorAll<HTMLButtonElement>('.ui-saved-views__body')];
  const text = (button: Element | undefined) => button?.textContent?.replace(/\s+/g, ' ').trim();
  return { fixture, element, store, actions, chips, text };
}

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container > *').forEach((node) => node.remove());
});

describe('SavedViewChipsComponent', () => {
  it('shows All with the total, then the views with their counts and the add button', async () => {
    const { element, chips, text, store } = await setup();
    expect(chips().map((chip) => text(chip))).toEqual([
      `All ${store.total()}`,
      `Videos ${store.items()[0]?.count}`,
      `Articles ${store.items()[1]?.count}`,
    ]);
    expect(element.querySelector('[role="toolbar"]')?.getAttribute('aria-label')).toBe(
      'Saved views',
    );
    expect(element.querySelector('.ui-saved-views__add')?.textContent).toContain('Save this view');
    expect(
      [...element.querySelectorAll('.ui-saved-views__menu')].map((menu) =>
        menu.getAttribute('aria-label'),
      ),
    ).toEqual(['Actions for Videos', 'Actions for Articles']);
  });

  it('presses All, the matching view, or nothing', async () => {
    const { fixture, chips } = await setup();
    const pressed = () => chips().map((chip) => chip.getAttribute('aria-pressed'));
    expect(pressed()).toEqual(['true', 'false', 'false']);
    fixture.componentInstance.filter.set({ scope: LINKS_SCOPE.All, kind: LINK_KIND.Article });
    await fixture.whenStable();
    expect(pressed()).toEqual(['false', 'false', 'true']);
    fixture.componentInstance.filter.set({ scope: LINKS_SCOPE.Unsorted });
    await fixture.whenStable();
    expect(pressed()).toEqual(['false', 'false', 'false']);
  });

  it('applies All or a view, and saves the current filter', async () => {
    const { fixture, chips, actions, store, element } = await setup();
    chips()[0]?.click();
    expect(actions.applyAll).toHaveBeenCalled();
    chips()[1]?.click();
    expect(actions.apply).toHaveBeenCalledWith(store.items()[0]);
    fixture.componentInstance.filter.set({ scope: LINKS_SCOPE.Favorites });
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('.ui-saved-views__add')?.click();
    expect(actions.saveCurrent).toHaveBeenCalledWith({ scope: LINKS_SCOPE.Favorites });
  });

  it('opens the menu of a view with rename, move and delete', async () => {
    const { fixture, element, actions, store } = await setup();
    const open = async (index: number) => {
      element.querySelectorAll<HTMLButtonElement>('.ui-saved-views__menu')[index]?.click();
      await fixture.whenStable();
    };
    const item = (label: string) =>
      [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((candidate) =>
        candidate.textContent?.includes(label),
      );

    await open(0);
    expect(document.querySelector('[role="menu"]')?.getAttribute('aria-label')).toBe(
      'Actions for Videos',
    );
    expect(item('Move left')?.getAttribute('aria-disabled')).toBe('true');
    expect(item('Move right')?.getAttribute('aria-disabled')).not.toBe('true');
    item('Move right')?.click();
    await fixture.whenStable();
    expect(actions.move).toHaveBeenCalledWith(store.items()[0], 1);

    await open(1);
    expect(item('Move right')?.getAttribute('aria-disabled')).toBe('true');
    item('Move left')?.click();
    await fixture.whenStable();
    expect(actions.move).toHaveBeenCalledWith(store.items()[1], -1);

    await open(1);
    item('Rename')?.click();
    await fixture.whenStable();
    expect(actions.rename).toHaveBeenCalledWith(store.items()[1]);

    await open(0);
    item('Delete view')?.click();
    await fixture.whenStable();
    expect(actions.delete).toHaveBeenCalledWith(store.items()[0]);
  });

  it('re-reads the counts when the library counts change', async () => {
    const { fixture, store } = await setup();
    const refresh = vi.spyOn(store, 'refresh');
    await TestBed.inject(FoldersStore).load();
    await fixture.whenStable();
    expect(refresh).toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    const { element } = await setup();
    expect(await axeViolations(element)).toEqual([]);
  });
});
